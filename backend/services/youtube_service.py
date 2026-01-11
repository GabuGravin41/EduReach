"""
YouTube Transcript and Metadata Extraction Service
"""

import os
import re
import requests
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import json
import time
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from youtube_transcript_api import YouTubeTranscriptApi

class YouTubeTranscriptService:
    """
    Service to extract transcripts and metadata from YouTube videos
    """
    
    def __init__(self):
        # YouTube API endpoints (no API key needed for transcripts)
        self.transcript_api_base = "https://www.youtube.com/api/timedtext"
        self.video_info_base = "https://www.youtube.com/watch"
        # Debug info: store last HTTP response captured when contacting YouTube
        self.last_response_info = None
        # Headers to mimic a real browser and bypass bot detection
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def _make_request(self, url: str, max_retries: int = 3, timeout: int = 15) -> Optional[requests.Response]:
        """
        Make HTTP request with browser headers and retry logic for bot detection.
        """
        for attempt in range(max_retries):
            try:
                response = requests.get(url, headers=self.headers, timeout=timeout)
                # Check for successful response
                if response.status_code == 200:
                    return response
                # If rate limited or blocked, wait and retry
                elif response.status_code in (429, 403):
                    wait_time = (2 ** attempt) + (attempt * 1)  # exponential backoff
                    if attempt < max_retries - 1:
                        time.sleep(wait_time)
                        continue
                    return response
                else:
                    return response
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    time.sleep((2 ** attempt) + 1)
                    continue
                return None
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep((2 ** attempt) + 1)
                    continue
                return None
        return None
        
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract video ID from various YouTube URL formats
        """
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def get_video_metadata(self, video_id: str) -> Dict:
        """
        Get video metadata (title, description, duration, etc.)
        """
        try:
            # Use YouTube oEmbed API (no API key required)
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            response = self._make_request(oembed_url)
            # record response for debugging
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
        """
        Get list of available transcript languages for a video
        """
        try:
            # Method 1: Try to get transcript list from video page
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            response = self._make_request(video_url)
            # record response for debugging
            if response:
                self._record_response(response, video_url)

            if response and response.status_code == 200:
                # Look for transcript data in the page
                content = response.text
                
                # Extract captions data from the page
                captions_pattern = r'"captions":.*?"playerCaptionsTracklistRenderer":\{"captionTracks":\[(.*?)\]'
                match = re.search(captions_pattern, content)
                
                if match:
                    captions_data = match.group(1)
                    # Parse available languages
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
        
        # Default to English if we can't detect languages
        return [{'language_code': 'en', 'language_name': 'English', 'auto_generated': True}]
    
    def extract_transcript(self, video_id: str, language_code: str = 'en') -> Dict:
        fallbacks = []
        # Try youtube-transcript-api
        try:
            res = self._extract_with_transcript_api(video_id, language_code)
            fallbacks.append({'method': 'youtube_transcript_api', 'result': bool(res)})
            if res:
                res['fallbacks'] = fallbacks
                return res
        except Exception as e:
            fallbacks.append({'method': 'youtube_transcript_api', 'error': str(e)})

        # Try direct API
        try:
            res = self._extract_with_direct_api(video_id, language_code)
            fallbacks.append({'method': 'direct_api', 'result': bool(res)})
            if res:
                res['fallbacks'] = fallbacks
                return res
        except Exception as e:
            fallbacks.append({'method': 'direct_api', 'error': str(e)})

        # Try web scraping
        try:
            res = self._extract_with_web_scraping(video_id)
            fallbacks.append({'method': 'web_scraping', 'result': bool(res)})
            if res:
                res['fallbacks'] = fallbacks
                return res
        except Exception as e:
            fallbacks.append({'method': 'web_scraping', 'error': str(e)})

        # Finally try yt_dlp (opt-in)
        try:
            res = self._extract_with_yt_dlp(video_id, language_code)
            fallbacks.append({'method': 'yt_dlp', 'result': bool(res)})
            if res:
                res['fallbacks'] = fallbacks
                return res
        except Exception as e:
            fallbacks.append({'method': 'yt_dlp', 'error': str(e)})

        # Nothing found
        return {
            'success': False,
            'error': 'Could not extract transcript from this video',
            'video_id': video_id,
            'transcript': '', 
            'segments': [],
            'fallbacks': fallbacks
        }
    
    def _extract_with_transcript_api(self, video_id: str, language_code: str) -> Optional[Dict]:
        """
        Extract using youtube-transcript-api library (if installed)
        """
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

            transcript_list = None

            # Primary: try the common get_transcript API if available
            if hasattr(YouTubeTranscriptApi, 'get_transcript'):
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
                except (NoTranscriptFound, TranscriptsDisabled):
                    # fallback to English
                    try:
                        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
                        language_code = 'en'
                    except (NoTranscriptFound, TranscriptsDisabled):
                        try:
                            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                        except Exception:
                            transcript_list = None

            # Secondary: some versions expose list_transcripts API
            if transcript_list is None and hasattr(YouTubeTranscriptApi, 'list_transcripts'):
                try:
                    transcript_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
                    # try to find preferred language
                    try:
                        fetched = transcript_list_obj.find_transcript([language_code]).fetch()
                        transcript_list = fetched
                    except Exception:
                        try:
                            fetched = transcript_list_obj.find_transcript(['en']).fetch()
                            transcript_list = fetched
                            language_code = 'en'
                        except Exception:
                            # try first available
                            try:
                                # pick first transcript key if available
                                keys = list(getattr(transcript_list_obj, '_transcripts', {}).keys())
                                if keys:
                                    fetched = transcript_list_obj.find_transcript(keys).fetch()
                                    transcript_list = fetched
                            except Exception:
                                transcript_list = None
                except Exception:
                    transcript_list = None

            if not transcript_list:
                return None

            # If transcript_list is in object form (list of dicts) or similar, normalize
            if isinstance(transcript_list, dict):
                entries = [transcript_list]
            else:
                entries = transcript_list

            # Format transcript with better spacing
            full_transcript = ' '.join([entry.get('text', '').strip() for entry in entries if entry.get('text', '').strip()])

            if not full_transcript:
                return None

            return {
                'success': True,
                'video_id': video_id,
                'language': language_code,
                'transcript': full_transcript,
                'segments': [
                    {
                        'start': float(entry.get('start', 0)),
                        'duration': float(entry.get('duration', 0)),
                        'text': entry.get('text', '').strip()
                    }
                    for entry in entries
                    if entry.get('text', '').strip()
                ],
                'word_count': len(full_transcript.split()),
                'extracted_at': datetime.now().isoformat(),
                'method': 'youtube_transcript_api'
            }

        except ImportError:
            print("youtube-transcript-api not installed")
            return None
        except VideoUnavailable:
            print(f"Video {video_id} is unavailable")
            return None
        except Exception as e:
            print(f"youtube-transcript-api extraction failed: {e}")
            return None
    
    def _extract_with_direct_api(self, video_id: str, language_code: str) -> Optional[Dict]:
        """
        Extract using direct YouTube API calls
        """
        try:
            # Try several timedtext endpoint variants to maximize chance of getting captions
            candidates = [
                f"{self.transcript_api_base}?lang={language_code}&v={video_id}",
                f"{self.transcript_api_base}?v={video_id}",
                f"{self.transcript_api_base}?tlang={language_code}&v={video_id}",
                f"{self.transcript_api_base}?v={video_id}&fmt=json3",
                f"{self.transcript_api_base}?v={video_id}&fmt=srv3",
            ]

            import xml.etree.ElementTree as ET

            for transcript_url in candidates:
                response = self._make_request(transcript_url)
                # record response for debugging
                if response:
                    self._record_response(response, transcript_url)

                if not response:
                    continue

                # If empty body or non-200, skip
                content = response.content or b''
                if response.status_code != 200 or not content.strip():
                    # log a helpful debug line
                    print(f"Direct API candidate failed: {transcript_url} status={response.status_code} len={len(content)}")
                    continue

                # Try parsing XML; if fails, log snippet for debugging
                try:
                    root = ET.fromstring(content)
                except ET.ParseError as pe:
                    snippet = ''
                    try:
                        snippet = content.decode('utf-8', errors='replace')[:500]
                    except Exception:
                        snippet = f'<binary {len(content)} bytes>'
                    print(f"Direct API XML parse error for {transcript_url}: {pe}; snippet={snippet}")
                    continue

                segments = []
                full_transcript = ""

                for text_elem in root.findall('.//text'):
                    start = float(text_elem.get('start', 0))
                    duration = float(text_elem.get('dur', 0))
                    text = text_elem.text or ""

                    # Clean up text
                    text = re.sub(r'&amp;', '&', text)
                    text = re.sub(r'&lt;', '<', text)
                    text = re.sub(r'&gt;', '>', text)

                    segments.append({
                        'start': start,
                        'duration': duration,
                        'text': text.strip()
                    })

                    full_transcript += text + " "

                if not full_transcript.strip():
                    # nothing useful found, try next candidate
                    continue

                return {
                    'success': True,
                    'video_id': video_id,
                    'language': language_code,
                    'transcript': full_transcript.strip(),
                    'segments': segments,
                    'word_count': len(full_transcript.split()),
                    'extracted_at': datetime.now().isoformat(),
                    'method': 'direct_api',
                    'used_url': transcript_url
                }
                
        except Exception as e:
            print(f"Direct API extraction failed: {e}")
            return None
    
    def _extract_with_web_scraping(self, video_id: str) -> Optional[Dict]:
        """
        Fallback method using web scraping
        """
        try:
            # This is a simplified version - in production you'd want more robust scraping
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            response = self._make_request(video_url)
            # record response for debugging
            if response:
                self._record_response(response, video_url)

            if response and response.status_code == 200:
                content = response.text
                
                # Look for transcript data in the page source
                # This is a simplified pattern - real implementation would be more complex
                transcript_pattern = r'"transcriptRenderer".*?"content":\{"runs":\[(.*?)\]'
                match = re.search(transcript_pattern, content, re.DOTALL)
                
                if match:
                    # Extract text from the matched content
                    # This would need more sophisticated parsing in practice
                    text_pattern = r'"text":"([^"]+)"'
                    texts = re.findall(text_pattern, match.group(1))
                    
                    full_transcript = ' '.join(texts)
                    
                    return {
                        'success': True,
                        'video_id': video_id,
                        'transcript': full_transcript,
                        'segments': [],  # Web scraping doesn't easily provide timestamps
                        'word_count': len(full_transcript.split()),
                        'extracted_at': datetime.now().isoformat(),
                        'method': 'web_scraping'
                    }
                    
        except Exception as e:
            print(f"Web scraping extraction failed: {e}")
            return None
        
    def _extract_with_yt_dlp(self, video_id: str, language_code: str = 'en') -> Optional[Dict]:
        """
        Use yt_dlp to inspect available subtitles (manual + auto) and fetch the best subtitle file.
        This is opt-in via YT_DLP_FALLBACK env var.
        """
        # Attempt to use yt_dlp if it's available (runs when package is installed).
        try:
            import yt_dlp
            print('yt_dlp detected: attempting yt_dlp fallback')
        except Exception:
            # yt_dlp not present; skip this fallback
            print('yt_dlp not available; skipping yt_dlp fallback')
            return None

        video_url = f"https://www.youtube.com/watch?v={video_id}"
        try:
            ydl_opts = {'skip_download': True, 'quiet': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
        except Exception as e:
            print(f"yt_dlp extract_info error: {e}")
            return None

        # subtitles (manual) and automatic_captions (auto-generated)
        subs = info.get('subtitles') or {}
        auto = info.get('automatic_captions') or {}

        # Helper selecting sources: prefer manual for requested language, then auto, then any language
        sources = []
        chosen_lang = language_code

        if language_code in subs:
            sources = subs[language_code]
        elif language_code in auto:
            sources = auto[language_code]
        else:
            if subs:
                chosen_lang = next(iter(subs.keys()))
                sources = subs[chosen_lang]
            elif auto:
                chosen_lang = next(iter(auto.keys()))
                sources = auto[chosen_lang]

        # If no subtitle sources, return None
        if not sources:
            return None

        # Try available formats (prefer vtt/srt)
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

            # Normalize common formats
            if ext in ('vtt', 'webvtt'):
                # Remove WEBVTT header and cue timestamps, keep text lines
                text = re.sub(r'WEBVTT.*?\n', '', text, flags=re.IGNORECASE | re.DOTALL)
                # remove timestamps like 00:00:00.000 --> 00:00:02.000
                text = re.sub(r'^\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$', '', text, flags=re.MULTILINE)
            elif ext in ('srt',):
                # Remove numeric indices and timestamps
                text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
                text = re.sub(r'^\s*\d{2}:\d{2}:\d{2},\d{3}.*$', '', text, flags=re.MULTILINE)
            elif ext in ('json3', 'srv3', 'ttml', 'xml'):
                # Try to parse XML and extract <text> nodes (best-effort)
                try:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(text)
                    parts = []
                    for elem in root.iter():
                        if elem.text and elem.text.strip():
                            parts.append(elem.text.strip())
                    text = ' '.join(parts)
                except Exception:
                    # fallback: strip timestamps and cues heuristically
                    text = re.sub(r'-->', '', text)
            # Fallback normalization: drop empty lines and timestamps
            lines = []
            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                if re.search(r'-->', line): continue
                if re.match(r'^\d+$', line): continue
                if re.match(r'^\d{2}:\d{2}:\d{2}', line): continue
                if line.upper().startswith('WEBVTT'): continue
                lines.append(line)
            full_transcript = ' '.join(lines).strip()
            if full_transcript:
                return {
                    'success': True,
                    'video_id': video_id,
                    'language': chosen_lang,
                    'transcript': full_transcript,
                    'segments': [],  # you could attempt to reconstruct timestamps later
                    'word_count': len(full_transcript.split()),
                    'extracted_at': datetime.now().isoformat(),
                    'method': 'yt_dlp',
                    'yt_dlp_format': ext,
                }

        return None

    def get_video_chapters(self, video_id: str) -> List[Dict]:
        """
        Extract video chapters/timestamps if available
        """
        try:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            response = self._make_request(video_url)
            # record response for debugging
            if response:
                self._record_response(response, video_url)

            if response and response.status_code == 200:
                content = response.text
                
                # Look for chapters data
                chapters_pattern = r'"macroMarkersListItemRenderer".*?"timeDescription":\{"simpleText":"([^"]+)".*?"title":\{"simpleText":"([^"]+)"'
                chapters = re.findall(chapters_pattern, content)
                
                return [
                    {
                        'timestamp': chapter[0],
                        'title': chapter[1]
                    }
                    for chapter in chapters
                ]
                
        except Exception as e:
            print(f"Error extracting chapters: {e}")
        
        return []
    
    def extract_complete_video_data(self, video_url: str, language_code: str = 'en') -> Dict:
        """
        Extract all available data from a YouTube video
        """
        video_id = self.extract_video_id(video_url)
        if not video_id:
            return {
                'success': False,
                'error': 'Invalid YouTube URL',
                'url': video_url
            }
        
        # Get metadata
        metadata = self.get_video_metadata(video_id)
        
        # Get available transcripts
        available_transcripts = self.get_available_transcripts(video_id)
        
        # Extract transcript
        transcript_data = self.extract_transcript(video_id, language_code)
        
        # Get chapters
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
        """
        Record a small snapshot of a requests.Response for debugging.
        """
        try:
            if response is None:
                return
            snippet = ''
            # Try to safely get a text snippet (limit to 1000 chars)
            try:
                text = response.text or ''
                # remove newlines for compactness
                snippet = text.replace('\n', ' ')[:1000]
            except Exception:
                snippet = ''

            self.last_response_info = {
                'url': url,
                'status_code': getattr(response, 'status_code', None),
                'reason': getattr(response, 'reason', None),
                'snippet': snippet
            }
        except Exception:
            # never raise from debugging helper
            self.last_response_info = None

@api_view(['POST'])
def extract_transcript(request):
    video_id = request.data.get('videoId')
    if not video_id:
        return Response({'error': 'Missing videoId'}, status=400)
    try:
        service = YouTubeTranscriptService()
        result = service.extract_transcript(video_id)
        if result and result.get('success'):
            return Response({
                'success': True,
                'video_id': video_id,
                'transcript': result.get('transcript'),
                'segments': result.get('segments', []),
                'language': result.get('language')
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Could not extract transcript'),
                'video_id': video_id,
            }, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

# Usage example:
"""
service = YouTubeTranscriptService()
result = service.extract_complete_video_data('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

if result['success']:
    transcript = result['transcript']['transcript']
    metadata = result['metadata']
    print(f"Video: {metadata['title']}")
    print(f"Transcript: {transcript[:200]}...")
else:
    print(f"Error: {result.get('error', 'Unknown error')}")
"""
