"""
YouTube Transcript and Metadata Extraction Service
"""

import re
import requests
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import json
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
            response = requests.get(oembed_url, timeout=10)
            
            if response.status_code == 200:
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
            response = requests.get(video_url, timeout=10)
            
            if response.status_code == 200:
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
        """
        Extract transcript for a specific video and language
        """
        try:
            # Method 1: Try youtube-transcript-api approach
            transcript_data = self._extract_with_transcript_api(video_id, language_code)
            if transcript_data:
                return transcript_data
            
            # Method 2: Try direct API approach
            transcript_data = self._extract_with_direct_api(video_id, language_code)
            if transcript_data:
                return transcript_data
            
            # Method 3: Fallback to web scraping
            transcript_data = self._extract_with_web_scraping(video_id)
            if transcript_data:
                return transcript_data
            
        except Exception as e:
            print(f"Error extracting transcript: {e}")
        
        return {
            'success': False,
            'error': 'Could not extract transcript from this video',
            'video_id': video_id,
            'transcript': '',
            'segments': []
        }
    
    def _extract_with_transcript_api(self, video_id: str, language_code: str) -> Optional[Dict]:
        """
        Extract using youtube-transcript-api library (if installed)
        """
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            
            # Get transcript
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code, 'en'])
            
            # Format transcript
            full_transcript = ' '.join([entry['text'] for entry in transcript_list])
            
            return {
                'success': True,
                'video_id': video_id,
                'language': language_code,
                'transcript': full_transcript,
                'segments': [
                    {
                        'start': entry['start'],
                        'duration': entry['duration'],
                        'text': entry['text']
                    }
                    for entry in transcript_list
                ],
                'word_count': len(full_transcript.split()),
                'extracted_at': datetime.now().isoformat(),
                'method': 'youtube_transcript_api'
            }
            
        except ImportError:
            print("youtube-transcript-api not installed")
            return None
        except Exception as e:
            print(f"youtube-transcript-api extraction failed: {e}")
            return None
    
    def _extract_with_direct_api(self, video_id: str, language_code: str) -> Optional[Dict]:
        """
        Extract using direct YouTube API calls
        """
        try:
            # Get transcript URL
            transcript_url = f"{self.transcript_api_base}?lang={language_code}&v={video_id}"
            
            response = requests.get(transcript_url, timeout=10)
            
            if response.status_code == 200:
                # Parse XML response
                import xml.etree.ElementTree as ET
                root = ET.fromstring(response.content)
                
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
                
                return {
                    'success': True,
                    'video_id': video_id,
                    'language': language_code,
                    'transcript': full_transcript.strip(),
                    'segments': segments,
                    'word_count': len(full_transcript.split()),
                    'extracted_at': datetime.now().isoformat(),
                    'method': 'direct_api'
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
            response = requests.get(video_url, timeout=10)
            
            if response.status_code == 200:
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
    
    def get_video_chapters(self, video_id: str) -> List[Dict]:
        """
        Extract video chapters/timestamps if available
        """
        try:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            response = requests.get(video_url, timeout=10)
            
            if response.status_code == 200:
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
            'extracted_at': datetime.now().isoformat()
        }

@api_view(['POST'])
def extract_transcript(request):
    video_id = request.data.get('videoId')
    if not video_id:
        return Response({'error': 'Missing videoId'}, status=400)

    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = ' '.join([item['text'] for item in transcript_list])
        return Response({'transcript': transcript_text})
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
