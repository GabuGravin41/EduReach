"""
YouTube Transcript and Metadata Extraction Service
"""

import os
import re
import requests
from typing import Dict, List, Optional
from urllib.parse import urlparse, parse_qs
import json
import time
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
# NOTE: youtube_transcript_api is imported inside _extract_with_transcript_api()
# with a try/except so that the entire service doesn't crash if it's
# missing or has version issues.  Do NOT add a top-level import here.

# Optional: path to a Netscape-format cookies.txt file exported from a browser
# while logged in to YouTube. Set YOUTUBE_COOKIES_FILE env var on the server.
# This dramatically improves reliability on datacenter IPs (Render, Railway, etc.)
_COOKIES_PATH = os.environ.get('YOUTUBE_COOKIES_FILE', '').strip() or None


class YouTubeTranscriptService:
    """
    Service to extract transcripts and metadata from YouTube videos.

    Two extraction methods, in order:
      1. youtube-transcript-api  (fast, free, uses YouTube's internal API)
      2. yt-dlp                  (slower, but more robust; reads subtitle files)

    Pass YOUTUBE_COOKIES_FILE env var pointing to a Netscape cookies.txt
    exported from a logged-in YouTube session to bypass datacenter IP blocks.
    """

    def __init__(self):
        self.video_info_base = "https://www.youtube.com/watch"
        self.last_response_info = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        # Resolve cookies path once at init time
        self.cookies_path = _COOKIES_PATH if (_COOKIES_PATH and os.path.isfile(_COOKIES_PATH)) else None
        if _COOKIES_PATH and not self.cookies_path:
            print(f"WARNING: YOUTUBE_COOKIES_FILE is set to '{_COOKIES_PATH}' but file does not exist. Transcripts may fail on server IPs.")

    def _make_request(self, url: str, max_retries: int = 3, timeout: int = 15) -> Optional[requests.Response]:
        for attempt in range(max_retries):
            try:
                response = requests.get(url, headers=self.headers, timeout=timeout)
                if response.status_code == 200:
                    return response
                elif response.status_code in (429, 403):
                    if attempt < max_retries - 1:
                        time.sleep((2 ** attempt) + attempt)
                        continue
                    return response
                else:
                    return response
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    time.sleep((2 ** attempt) + 1)
                    continue
                return None
            except Exception:
                if attempt < max_retries - 1:
                    time.sleep((2 ** attempt) + 1)
                    continue
                return None
        return None

    def extract_video_id(self, url: str) -> Optional[str]:
        if not url:
            return None
        url = url.strip()
        if re.match(r'^[0-9A-Za-z_-]{11}$', url):
            return url
        match = re.search(
            r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([0-9A-Za-z_-]{11})',
            url
        )
        if match:
            return match.group(1)
        return None

    def get_video_metadata(self, video_id: str) -> Dict:
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            response = self._make_request(oembed_url)
            if response:
                self._record_response(response, oembed_url)
            if response and response.status_code == 200:
                data = response.json()
                return {
                    'title': data.get('title', ''),
                    'author': data.get('author_name', ''),
                    'duration': data.get('duration', 0),
                    'thumbnail_url': data.get('thumbnail_url', ''),
                    'provider': data.get('provider_name', 'YouTube'),
                    'video_id': video_id,
                    'extracted_at': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error fetching video metadata: {e}")
        return {
            'video_id': video_id,
            'title': f'YouTube Video {video_id}',
            'extracted_at': datetime.now().isoformat()
        }

    def get_available_transcripts(self, video_id: str) -> List[Dict]:
        try:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            response = self._make_request(video_url)
            if response:
                self._record_response(response, video_url)
            if response and response.status_code == 200:
                content = response.text
                captions_pattern = r'"captions":.*?"playerCaptionsTracklistRenderer":\{"captionTracks":\[(.*?)\]'
                match = re.search(captions_pattern, content)
                if match:
                    captions_data = match.group(1)
                    lang_pattern = r'"languageCode":"([^"]+)".*?"name":\{"simpleText":"([^"]+)"'
                    languages = re.findall(lang_pattern, captions_data)
                    return [
                        {
                            'language_code': lang[0],
                            'language_name': lang[1],
                            'auto_generated': 'auto-generated' in lang[1].lower()
                        }
                        for lang in languages
                    ]
        except Exception as e:
            print(f"Error getting available transcripts: {e}")
        return [{'language_code': 'en', 'language_name': 'English', 'auto_generated': True}]

    def extract_transcript(self, video_id: str, language_code: str = 'en') -> Dict:
        fallbacks = []

        # Method 1: youtube-transcript-api
        try:
            res = self._extract_with_transcript_api(video_id, language_code)
            fallbacks.append({'method': 'youtube_transcript_api', 'result': bool(res)})
            if res:
                res['fallbacks'] = fallbacks
                return res
        except Exception as e:
            fallbacks.append({'method': 'youtube_transcript_api', 'error': str(e)})

        # Method 2: yt-dlp
        try:
            res = self._extract_with_yt_dlp(video_id, language_code)
            fallbacks.append({'method': 'yt_dlp', 'result': bool(res)})
            if res:
                res['fallbacks'] = fallbacks
                return res
        except Exception as e:
            fallbacks.append({'method': 'yt_dlp', 'error': str(e)})

        return {
            'success': False,
            'error': 'Could not extract transcript. The video may have no captions, or YouTube is blocking server requests. Try adding a YOUTUBE_COOKIES_FILE.',
            'video_id': video_id,
            'transcript': '',
            'segments': [],
            'fallbacks': fallbacks
        }

    def _extract_with_transcript_api(self, video_id: str, language_code: str) -> Optional[Dict]:
        """
        Extract using youtube-transcript-api. Passes cookies if YOUTUBE_COOKIES_FILE is set.
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

            # v1.x: instance-based API (v1.x uses http_client, not cookies kwarg)
            if _is_v1:
                try:
                    http_client = None
                    if self.cookies_path:
                        try:
                            import requests
                            from http.cookiejar import MozillaCookieJar
                            session = requests.Session()
                            jar = MozillaCookieJar(self.cookies_path)
                            jar.load(ignore_discard=True, ignore_expires=True)
                            session.cookies = jar
                            http_client = session
                        except Exception as e:
                            print(f"Failed to load cookies into session: {e}")

                    api_kwargs = {}
                    if http_client is not None:
                        api_kwargs['http_client'] = http_client
                    api = YouTubeTranscriptApi(**api_kwargs)

                    for langs in ([language_code], ['en'], []):
                        try:
                            transcript_list = api.fetch(video_id, languages=langs) if langs else api.fetch(video_id)
                            if langs and langs != [language_code]:
                                language_code = langs[0] if langs else language_code
                            break
                        except Exception:
                            continue
                except Exception as e:
                    print(f"youtube-transcript-api v1.x fetch failed: {e}")
                    transcript_list = None

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

            def format_ts(seconds):
                s = int(seconds)
                m, s = divmod(s, 60)
                h, m = divmod(m, 60)
                return f"[{h:02d}:{m:02d}:{s:02d}]" if h > 0 else f"[{m:02d}:{s:02d}]"

            timestamped_parts = [
                f"{format_ts(e.get('start', 0))} {e.get('text', '').strip()}"
                for e in normalized if e.get('text', '').strip()
            ]

            if not full_transcript:
                return None

            return {
                'success': True,
                'video_id': video_id,
                'language': language_code,
                'transcript': full_transcript,
                'timestamped_transcript': ' '.join(timestamped_parts),
                'segments': [
                    {
                        'start': float(e.get('start', 0)),
                        'duration': float(e.get('duration', 0)),
                        'text': e.get('text', '').strip()
                    }
                    for e in normalized if e.get('text', '').strip()
                ],
                'word_count': len(full_transcript.split()),
                'extracted_at': datetime.now().isoformat(),
                'method': 'youtube_transcript_api',
                'used_cookies': bool(self.cookies_path)
            }

        except ImportError:
            print("youtube-transcript-api not installed")
            return None
        except Exception as e:
            print(f"youtube-transcript-api extraction failed: {e}")
            return None

    def _extract_with_yt_dlp(self, video_id: str, language_code: str = 'en') -> Optional[Dict]:
        """
        Use yt-dlp to fetch subtitles. Falls back to auto-captions if manual subs
        are unavailable. Passes cookies file if configured.
        """
        try:
            import yt_dlp
        except ImportError:
            print('yt_dlp not installed; skipping yt_dlp fallback')
            return None

        video_url = f"https://www.youtube.com/watch?v={video_id}"

        # Ensure deno is on PATH for yt-dlp JS challenge solving
        import os as _os
        deno_bin = _os.path.expanduser('~/.deno/bin')
        env_path = _os.environ.get('PATH', '')
        if deno_bin not in env_path:
            _os.environ['PATH'] = deno_bin + ':' + env_path

        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'remote_components': ['ejs:github'],  # enable JS challenge solver download
        }
        if self.cookies_path:
            ydl_opts['cookiefile'] = self.cookies_path

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
        except Exception as e:
            print(f"yt_dlp extract_info error: {e}")
            return None

        subs = info.get('subtitles') or {}
        auto = info.get('automatic_captions') or {}

        sources = []
        chosen_lang = language_code

        if language_code in subs:
            sources = subs[language_code]
        elif language_code in auto:
            sources = auto[language_code]
        elif subs:
            chosen_lang = next(iter(subs))
            sources = subs[chosen_lang]
        elif auto:
            chosen_lang = next(iter(auto))
            sources = auto[chosen_lang]

        if not sources:
            return None

        for fmt in sources:
            url = fmt.get('url')
            ext = fmt.get('ext', '').lower()
            if not url:
                continue
            try:
                r = requests.get(url, headers=self.headers, timeout=15)
                if r.status_code != 200 or not r.content.strip():
                    continue
                text = r.content.decode('utf-8', errors='replace')
            except Exception as e:
                print(f"yt_dlp subtitle fetch error for {url}: {e}")
                continue

            if ext in ('vtt', 'webvtt'):
                text = re.sub(r'WEBVTT.*?\n', '', text, flags=re.IGNORECASE | re.DOTALL)
                text = re.sub(r'^\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$', '', text, flags=re.MULTILINE)
            elif ext == 'srt':
                text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
                text = re.sub(r'^\s*\d{2}:\d{2}:\d{2},\d{3}.*$', '', text, flags=re.MULTILINE)
            elif ext in ('json3', 'srv3', 'ttml', 'xml'):
                try:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(text)
                    parts = [elem.text.strip() for elem in root.iter() if elem.text and elem.text.strip()]
                    text = ' '.join(parts)
                except Exception:
                    text = re.sub(r'-->', '', text)

            lines = []
            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                if re.search(r'-->', line):
                    continue
                if re.match(r'^\d+$', line):
                    continue
                if re.match(r'^\d{2}:\d{2}:\d{2}', line):
                    continue
                if line.upper().startswith('WEBVTT'):
                    continue
                lines.append(line)

            full_transcript = ' '.join(lines).strip()
            if full_transcript:
                return {
                    'success': True,
                    'video_id': video_id,
                    'language': chosen_lang,
                    'transcript': full_transcript,
                    'segments': [],
                    'word_count': len(full_transcript.split()),
                    'extracted_at': datetime.now().isoformat(),
                    'method': 'yt_dlp',
                    'yt_dlp_format': ext,
                    'used_cookies': bool(self.cookies_path)
                }

        return None

    def get_video_chapters(self, video_id: str) -> List[Dict]:
        try:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            response = self._make_request(video_url)
            if response:
                self._record_response(response, video_url)
            if response and response.status_code == 200:
                content = response.text
                chapters_pattern = r'"macroMarkersListItemRenderer".*?"timeDescription":\{"simpleText":"([^"]+)".*?"title":\{"simpleText":"([^"]+)"'
                chapters = re.findall(chapters_pattern, content)
                return [{'timestamp': c[0], 'title': c[1]} for c in chapters]
        except Exception as e:
            print(f"Error extracting chapters: {e}")
        return []

    def extract_complete_video_data(self, video_url: str, language_code: str = 'en') -> Dict:
        video_id = self.extract_video_id(video_url)
        if not video_id:
            return {'success': False, 'error': 'Invalid YouTube URL', 'url': video_url}

        metadata = self.get_video_metadata(video_id)
        available_transcripts = self.get_available_transcripts(video_id)
        transcript_data = self.extract_transcript(video_id, language_code)
        chapters = self.get_video_chapters(video_id)

        return {
            'success': transcript_data.get('success', False),
            'video_id': video_id,
            'url': video_url,
            'metadata': metadata,
            'transcript': transcript_data,
            'available_languages': available_transcripts,
            'chapters': chapters,
            'server_debug': self.last_response_info,
            'extracted_at': datetime.now().isoformat()
        }

    def _record_response(self, response, url: str):
        try:
            if response is None:
                return
            snippet = ''
            try:
                snippet = (response.text or '').replace('\n', ' ')[:1000]
            except Exception:
                snippet = ''
            self.last_response_info = {
                'url': url,
                'status_code': getattr(response, 'status_code', None),
                'reason': getattr(response, 'reason', None),
                'snippet': snippet
            }
        except Exception:
            self.last_response_info = None


@api_view(['POST'])
def extract_transcript(request):
    video_id = request.data.get('videoId')
    if not video_id:
        return Response({'error': 'Missing videoId'}, status=400)
    try:
        from video_cache.models import VideoCache
        db_cache = VideoCache.objects.filter(video_id=video_id, is_processed=True).first()
        if db_cache:
            return Response({
                'success': True,
                'video_id': video_id,
                'transcript': db_cache.transcript,
                'concepts': db_cache.concepts,
                'relationships': db_cache.relationships,
                'quizzes': db_cache.quizzes,
                'source': 'database'
            })

        service = YouTubeTranscriptService()
        result = service.extract_transcript(video_id)
        if result and result.get('success'):
            return Response({
                'success': True,
                'video_id': video_id,
                'transcript': result.get('transcript'),
                'timestamped_transcript': result.get('timestamped_transcript'),
                'segments': result.get('segments', []),
                'language': result.get('language'),
                'method': result.get('method'),
                'used_cookies': result.get('used_cookies', False)
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Could not extract transcript'),
                'video_id': video_id,
                'fallbacks': result.get('fallbacks', [])
            }, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
