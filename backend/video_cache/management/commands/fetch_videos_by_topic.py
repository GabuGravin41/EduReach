"""
Management command to fetch YouTube videos and transcripts by topic.

Features:
- Accepts multiple topics; per-topic fetch limit (default 50).
- Uses yt-dlp to search (no API key) and prefers playlists when found.
- Fetches transcripts using youtube-transcript-api; falls back to automatic captions when needed.
- Pauses between requests to avoid blocking (default delay 3s).
- Saves progress to a JSON state file so it can be paused/resumed.
"""
from __future__ import annotations

import json
import os
import signal
import time
from typing import Any, Dict, List

from django.conf import settings
from django.core.management.base import BaseCommand

# ── Absolute default path — resolves correctly regardless of CWD ──────────────
# Uses Django's BASE_DIR (the directory containing manage.py / the backend root).
# Previously this was a relative path ('backend/video_cache/data/...') which
# silently wrote to a non-existent location when manage.py was run from inside
# the backend/ directory.  Now it is always absolute.
_DATA_SUBDIR = os.path.join('video_cache', 'data')
STATE_DEFAULT = None

def _get_default_state_file() -> str:
    """Compute default state file path lazily using Django settings when available.

    Falls back to a sensible path inside the backend package if settings are
    not configured (so importing this module outside a fully-configured
    Django runtime does not raise).
    """
    try:
        base = str(settings.BASE_DIR)
    except Exception:
        # Fallback: three levels up from this file should reach the backend/ root
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    return os.path.join(base, _DATA_SUBDIR, 'video_cache_state.json')

def extract_transcript_direct(video_id: str, language_code: str = 'en') -> dict | None:
    """
    Robust extraction using youtube-transcript-api. 
    Supports both v1.x (instance methods) and v0.x (class methods).
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        try:
            from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
        except ImportError:
            TranscriptsDisabled = NoTranscriptFound = VideoUnavailable = Exception

        transcript_list = None

        # Detect v1.x vs v0.x
        _is_v1 = False
        try:
            import importlib.metadata as _meta
            _ver = _meta.version('youtube-transcript-api')
            _is_v1 = int(_ver.split('.')[0]) >= 1
        except Exception:
            _is_v1 = hasattr(YouTubeTranscriptApi, 'fetch') and not hasattr(YouTubeTranscriptApi, 'get_transcript')

        # v1.x: instance-based API
        api = None
        if _is_v1:
            # Initialize API client (separate from fetching to preserve `api` for fallbacks)
            try:
                cookies_path = getattr(settings, 'YOUTUBE_COOKIES_FILE', os.environ.get('YOUTUBE_COOKIES_FILE'))
                api_kwargs = {}
                if cookies_path and os.path.isfile(cookies_path):
                    api_kwargs['cookies'] = cookies_path
                api = YouTubeTranscriptApi(**api_kwargs)
            except Exception as e:
                print(f"youtube-transcript-api v1.x init failed: {e}")

            if api is not None:
                for langs in ([language_code], ['en'], []):
                    try:
                        transcript_list = api.fetch(video_id, languages=langs) if langs else api.fetch(video_id)
                        if langs and langs != [language_code]:
                            language_code = langs[0] if langs else language_code
                        break
                    except Exception as e:
                        # record the exception for debugging but continue trying other languages
                        print(f"youtube-transcript-api fetch attempt failed for {video_id} lang={langs}: {e}")
                        continue

        # Additional v1.x fallback: use the TranscriptList API to try fetching
        # or translating available transcripts. This often succeeds when
        # a direct fetch() returns None (for example when only auto-generated
        # captions exist and need translation).
        if transcript_list is None and _is_v1:
            try:
                tr_list = api.list(video_id)
                for tr in tr_list:
                    try:
                        transcript_list = tr.fetch()
                        break
                    except Exception:
                        try:
                            transcript_list = tr.translate('en').fetch()
                            language_code = 'en'
                            break
                        except Exception:
                            continue
            except Exception:
                # leave transcript_list as None
                pass

        # v0.x: class-method API
        if transcript_list is None and hasattr(YouTubeTranscriptApi, 'get_transcript'):
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
            except (NoTranscriptFound, TranscriptsDisabled):
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
                    language_code = 'en'
                except (NoTranscriptFound, TranscriptsDisabled):
                    try:
                        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                    except Exception:
                        transcript_list = None

        if not transcript_list:
            return None

        # Normalize entries (v1.x objects vs v0.x dicts)
        entries = list(transcript_list) if not isinstance(transcript_list, dict) else [transcript_list]
        normalized = []
        for entry in entries:
            if isinstance(entry, dict):
                normalized.append(entry)
            else:
                normalized.append({
                    'text': getattr(entry, 'text', str(entry)),
                    'start': float(getattr(entry, 'start', 0)),
                    'duration': float(getattr(entry, 'duration', 0)),
                })

        full_transcript = ' '.join(e.get('text', '').strip() for e in normalized if e.get('text', '').strip())

        if not full_transcript:
            return None

        return {
            'success': True,
            'video_id': video_id,
            'language': language_code,
            'transcript': full_transcript,
            'segments': [
                {
                    'start': float(e.get('start', 0)),
                    'duration': float(e.get('duration', 0)),
                    'text': e.get('text', '').strip()
                }
                for e in normalized if e.get('text', '').strip()
            ],
            'word_count': len(full_transcript.split()),
        }
    except Exception as e:
        print(f"Failed to extract transcript for {video_id}: {e}")
        return None

# ── Built-in trusted / high-quality channel list ─────────────────────────────
# Videos from these channels are promoted to the front of the candidate list.
# Add more by name (case-insensitive match against yt-dlp 'uploader' field).
BUILTIN_TRUSTED_CHANNELS = {
    'stanford online',
    'stanford university',
    'mit opencourseware',
    'khan academy',
    'freecodecamp.org',
    '3blue1brown',
    'crashcourse',
    'ted-ed',
    'tedx talks',
    'ted',
    'traversy media',
    'fireship',
    'sentdex',
    'tech with tim',
    'cs50',
    'harvard university',
    'yale courses',
    'oxford mathematics',
    'google developers',
    'microsoft developer',
    'aws',
    'the coding train',
    'two minute papers',
    'veritasium',
    'numberphile',
    'computerphile',
    'simons foundation',
    'national geographic',
    'nasa',
    'bbc learning english',
}


def ensure_data_dir(state_file: str) -> None:
    """Create the directory that will hold the state JSON file."""
    d = os.path.dirname(state_file)
    if d:
        os.makedirs(d, exist_ok=True)


def _atomic_save(state_file: str, state: dict) -> None:
    """Write state to disk with flush+fsync so data survives a Ctrl-C."""
    try:
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception as exc:
        # Print to stderr so the operator knows; never silently swallow.
        import sys
        print(f'[ERROR] Could not save state to {state_file!r}: {exc}', file=sys.stderr)


class GracefulKiller:
    def __init__(self):
        self.kill_now = False

    def register(self):
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)

    def exit_gracefully(self, signum, frame):
        print('\nReceived stop signal -- will save state and exit after current item...')
        self.kill_now = True


class Command(BaseCommand):
    help = 'Fetch YouTube videos and transcripts for given topics and save JSON state.'

    def add_arguments(self, parser):
        parser.add_argument('topics', nargs='*', help='Topics to search for')
        parser.add_argument('--limit', type=int, default=50, help='Videos per topic (default 50)')
        parser.add_argument('--delay', type=float, default=3.0, help='Seconds delay between requests')
        parser.add_argument('--state-file', type=str, default=None,
                    help='Absolute path to state JSON file (default: computed from BASE_DIR)')
        parser.add_argument('--proxy', type=str, default=None,
                    help='Optional HTTP(S) proxy to use for requests (e.g. http://127.0.0.1:8080)')
        parser.add_argument('--output-dir', type=str, default=None,
                            help='Write state file to this directory (overrides --state-file directory)')
        parser.add_argument('--resume', action='store_true', help='Resume from existing state file')
        parser.add_argument('--trusted-channels-file', type=str, default=None,
                            help='Optional file with extra trusted channel names (one per line); built-in list always applied')

    def handle(self, *args, **options):
        topics: List[str] = options.get('topics') or []
        limit: int = options.get('limit')
        delay: float = options.get('delay')
        state_file: str = options.get('state_file')
        proxy: str | None = options.get('proxy')
        output_dir: str | None = options.get('output_dir')
        resume: bool = options.get('resume')
        trusted_file: str | None = options.get('trusted_channels_file')

        # Compute default state file lazily (avoid accessing settings at import time)
        if not state_file:
            state_file = _get_default_state_file()

        # Apply --output-dir override: keep filename, change directory
        if output_dir:
            state_file = os.path.join(
                os.path.abspath(output_dir),
                os.path.basename(state_file)
            )

        # Set proxy environment for downstream libraries if provided.
        # This lets youtube-transcript-api and requests pick it up automatically.
        if proxy:
            os.environ['YOUTUBE_PROXY'] = proxy
            os.environ['HTTP_PROXY'] = proxy
            os.environ['HTTPS_PROXY'] = proxy
            os.environ['http_proxy'] = proxy
            os.environ['https_proxy'] = proxy

        ensure_data_dir(state_file)
        self.stdout.write(self.style.NOTICE(f'State file: {state_file}'))

        # Start with built-in trusted channels; supplement from file if provided
        trusted_channels = set(BUILTIN_TRUSTED_CHANNELS)
        if trusted_file and os.path.isfile(trusted_file):
            with open(trusted_file, 'r', encoding='utf-8') as f:
                for line in f:
                    t = line.strip()
                    if t:
                        trusted_channels.add(t.lower())

        state = {
            'topics': [],
            'results': {},
            'current_topic_index': 0,
        }

        if resume and os.path.isfile(state_file):
            with open(state_file, 'r', encoding='utf-8') as f:
                state = json.load(f)
            self.stdout.write(self.style.SUCCESS(f'Resuming from state file {state_file}'))
        else:
            state['topics'] = [{'name': t, 'limit': limit, 'processed': 0} for t in topics]

        killer = GracefulKiller()
        killer.register()

        try:
            import yt_dlp
        except Exception as e:
            self.stderr.write('yt-dlp is required. Please add it to requirements and install it.')
            return

        # We will use our direct extraction function defined above
        youtube_service = None

        # Main loop over topics
        for idx in range(state.get('current_topic_index', 0), len(state['topics'])):
            topic_obj = state['topics'][idx]
            topic = topic_obj['name']
            collected: List[Dict[str, Any]] = state['results'].get(topic, [])

            topic_limit = int(topic_obj.get('limit') or limit)
            self.stdout.write(self.style.NOTICE(f"Starting topic [{idx+1}/{len(state['topics'])}]: {topic} (need {topic_limit})"))

            # Search using yt-dlp (extract_flat gives us a cheap list of entries)
            ydl_opts = {'quiet': True, 'skip_download': True, 'extract_flat': True}
            if proxy:
                ydl_opts['proxy'] = proxy
            search_query = f"ytsearch{topic_limit}:{topic}"

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    search_info = ydl.extract_info(search_query, download=False)
                except Exception as e:
                    self.stderr.write(f"Search failed for topic {topic}: {e}")
                    search_info = {'entries': []}

            entries = search_info.get('entries') or []

            # Expand playlist entries first (prefer playlists)
            expanded_videos: List[Dict[str, Any]] = []

            for entry in entries:
                if killer.kill_now:
                    break
                # Some entries could be playlists; detect by presence of 'is_playlists' or 'webpage_url' containing 'list='
                url = entry.get('webpage_url') or entry.get('url')
                _type = entry.get('_type')
                if (_type == 'playlist') or (isinstance(url, str) and 'list=' in url):
                    # Extract playlist contents — disable any subtitle/caption download
                    # so yt-dlp doesn't try to fetch VTT files for every video.
                    playlist_opts = {
                        'quiet': True,
                        'skip_download': True,
                        'writesubtitles': False,
                        'writeautomaticsub': False,
                        'writethumbnail': False,
                    }
                    if proxy:
                        playlist_opts['proxy'] = proxy
                    try:
                        with yt_dlp.YoutubeDL(playlist_opts) as y2:
                            info = y2.extract_info(url, download=False)
                            sub = info.get('entries') or []
                            # Promote trusted-channel playlists by tagging entries
                            uploader = (entry.get('uploader') or '').lower()
                            is_trusted_playlist = uploader in trusted_channels
                            for s in sub:
                                s['_playlist_source'] = entry.get('title') or url
                                s['_playlist_uploader'] = entry.get('uploader')
                                if is_trusted_playlist:
                                    s['_trusted_playlist'] = True
                            expanded_videos.extend(sub)
                    except Exception:
                        continue
                else:
                    expanded_videos.append(entry)

            # Deduplicate and sort by view_count if available
            seen = set(v.get('id') for v in collected)
            candidates: Dict[str, Dict[str, Any]] = {}
            for e in expanded_videos:
                vid = e.get('id')
                if not vid:
                    continue
                if vid in candidates:
                    continue
                candidates[vid] = e

            # Convert to list and sort by view_count (desc) when available
            candidate_list = list(candidates.values())
            def view_sort_key(x):
                return -(x.get('view_count') or 0)

            candidate_list.sort(key=view_sort_key)

            # If trusted channels exist, promote videos from those uploaders
            if trusted_channels:
                trusted = [c for c in candidate_list if (c.get('uploader') or '').lower() in trusted_channels]
                not_trusted = [c for c in candidate_list if (c.get('uploader') or '').lower() not in trusted_channels]
                candidate_list = trusted + not_trusted

            # Iterate candidates until we collect limit
            for cand in candidate_list:
                if killer.kill_now:
                    break
                if len(collected) >= topic_limit:
                    break
                vid = cand.get('id')
                if not vid or vid in seen:
                    continue

                video_url = cand.get('webpage_url') or f"https://www.youtube.com/watch?v={vid}"
                title = cand.get('title') or ''
                uploader = cand.get('uploader') or cand.get('uploader_id') or ''
                view_count = cand.get('view_count') or 0
                duration = cand.get('duration') or 0
                thumbnail = cand.get('thumbnail') or cand.get('thumbnails') and cand.get('thumbnails')[0].get('url') if cand.get('thumbnails') else None

                self.stdout.write(f"Fetching transcript: {title[:80]} ({vid}) - views={view_count}")

                transcript_text = ''
                transcript_json = None

                # Use our robust direct extraction function
                try:
                    res = extract_transcript_direct(vid)
                    if res and res.get('success'):
                        transcript_text = res.get('transcript') or ''
                        transcript_json = res.get('segments')
                except Exception as e:
                    self.stderr.write(f"Direct transcript error: {e}")
                    transcript_text = ''

                # Fallback: use yt-dlp to get automatic captions (if any)
                if not transcript_text:
                    try:
                        ydl_info_opts = {'quiet': True}
                        if proxy:
                            ydl_info_opts['proxy'] = proxy
                        with yt_dlp.YoutubeDL(ydl_info_opts) as ydl:
                            info = ydl.extract_info(video_url, download=False)
                            subs = info.get('automatic_captions') or info.get('subtitles') or {}
                            chosen = None
                            if 'en' in subs:
                                chosen = subs['en'][0]
                            elif subs:
                                first = next(iter(subs.values()))
                                chosen = first[0] if first else None
                            if chosen and chosen.get('url'):
                                import requests
                                headers = {
                                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
                                }
                                raw = None
                                for attempt in range(3):
                                    try:
                                        # Respect proxy env if present; requests will
                                        # pick up environment proxies automatically,
                                        # but pass explicit proxies to be safe.
                                        proxies = None
                                        p = os.environ.get('YOUTUBE_PROXY') or os.environ.get('HTTP_PROXY') or os.environ.get('HTTPS_PROXY')
                                        if p:
                                            proxies = {'http': p, 'https': p}
                                        r = requests.get(chosen['url'], timeout=15, headers=headers, proxies=proxies)
                                        if r.status_code == 200:
                                            raw = r.content.decode('utf-8', errors='replace')
                                            break
                                        else:
                                            time.sleep(1 + attempt * 2)
                                    except Exception:
                                        time.sleep(1 + attempt * 2)
                                if raw:
                                    # crude cleanup
                                    cleaned = '\n'.join([ln.strip() for ln in raw.splitlines() if ln.strip()])
                                    transcript_text = cleaned
                    except Exception:
                        pass

                item = {
                    'video_id': vid,
                    'url': video_url,
                    'title': title,
                    'channel_name': uploader,
                    'view_count': view_count,
                    'duration': duration,
                    'thumbnail_url': thumbnail,
                    'transcript': transcript_text,
                    'transcript_json': transcript_json,
                    'topic': topic,
                    'fetched_at': time.time(),
                }

                collected.append(item)
                seen.add(vid)

                # Save progress after every video (flush+fsync for crash safety)
                state['results'][topic] = collected
                state['current_topic_index'] = idx
                _atomic_save(state_file, state)

                # Respect delay
                if killer.kill_now:
                    break
                time.sleep(delay)

            # Topic finished
            self.stdout.write(self.style.SUCCESS(f"Finished topic '{topic}': collected {len(collected)} videos"))

            # Save final topic state (topic complete, advance index)
            state['results'][topic] = collected
            state['current_topic_index'] = idx + 1
            _atomic_save(state_file, state)

            if killer.kill_now:
                break

        self.stdout.write(self.style.SUCCESS('All done or stopped. State saved to: ' + state_file))
