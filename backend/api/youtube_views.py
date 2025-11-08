"""
YouTube API Views for EduReach
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from django.conf import settings
import hashlib
import json

from services.youtube_service import YouTubeTranscriptService

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_youtube_transcript(request):
    """
    Extract transcript from YouTube video
    
    POST /api/youtube/extract-transcript/
    {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID",
        "language": "en" (optional)
    }
    """
    try:
        url = request.data.get('url')
        language = request.data.get('language', 'en')
        
        if not url:
            return Response({
                'error': 'YouTube URL is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check cache first
        cache_key = f"youtube_transcript:{hashlib.md5(f'{url}:{language}'.encode()).hexdigest()}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return Response({
                'success': True,
                'cached': True,
                **cached_result
            })
        
        # Extract transcript
        service = YouTubeTranscriptService()
        result = service.extract_complete_video_data(url, language)
        
        if result['success']:
            # Cache successful results for 1 hour
            cache_data = {
                'video_id': result['video_id'],
                'metadata': result['metadata'],
                'transcript': result['transcript'],
                'available_languages': result['available_languages'],
                'chapters': result['chapters']
            }
            cache.set(cache_key, cache_data, 3600)  # 1 hour
            
            return Response({
                'success': True,
                'cached': False,
                **cache_data
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Failed to extract transcript'),
                'url': url
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_video_info(request):
    """
    Get basic video information without transcript
    
    GET /api/youtube/video-info/?url=VIDEO_URL
    """
    try:
        url = request.GET.get('url')
        
        if not url:
            return Response({
                'error': 'YouTube URL is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service = YouTubeTranscriptService()
        video_id = service.extract_video_id(url)
        
        if not video_id:
            return Response({
                'error': 'Invalid YouTube URL'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check cache
        cache_key = f"youtube_info:{video_id}"
        cached_info = cache.get(cache_key)
        
        if cached_info:
            return Response({
                'success': True,
                'cached': True,
                **cached_info
            })
        
        # Get video metadata
        metadata = service.get_video_metadata(video_id)
        available_languages = service.get_available_transcripts(video_id)
        
        result = {
            'video_id': video_id,
            'metadata': metadata,
            'available_languages': available_languages,
            'has_transcript': len(available_languages) > 0
        }
        
        # Cache for 6 hours
        cache.set(cache_key, result, 21600)
        
        return Response({
            'success': True,
            'cached': False,
            **result
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_video_notes(request):
    """
    Save user notes for a video
    
    POST /api/youtube/save-notes/
    {
        "video_id": "VIDEO_ID",
        "notes": "User notes content",
        "timestamps": [
            {"time": 120, "note": "Important point at 2:00"},
            {"time": 300, "note": "Key concept at 5:00"}
        ]
    }
    """
    try:
        video_id = request.data.get('video_id')
        notes = request.data.get('notes', '')
        timestamps = request.data.get('timestamps', [])
        
        if not video_id:
            return Response({
                'error': 'Video ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save to database (you'll need to create a VideoNotes model)
        from assessments.models import VideoNotes  # You'll need to create this model
        
        video_notes, created = VideoNotes.objects.update_or_create(
            user=request.user,
            video_id=video_id,
            defaults={
                'notes': notes,
                'timestamps': timestamps,
                'updated_at': timezone.now()
            }
        )
        
        return Response({
            'success': True,
            'message': 'Notes saved successfully',
            'notes_id': video_notes.id,
            'created': created
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_video_notes(request):
    """
    Get user's notes for videos
    
    GET /api/youtube/notes/?video_id=VIDEO_ID (optional)
    """
    try:
        video_id = request.GET.get('video_id')
        
        from assessments.models import VideoNotes
        
        if video_id:
            # Get notes for specific video
            try:
                notes = VideoNotes.objects.get(user=request.user, video_id=video_id)
                return Response({
                    'success': True,
                    'notes': {
                        'id': notes.id,
                        'video_id': notes.video_id,
                        'notes': notes.notes,
                        'timestamps': notes.timestamps,
                        'created_at': notes.created_at,
                        'updated_at': notes.updated_at
                    }
                })
            except VideoNotes.DoesNotExist:
                return Response({
                    'success': True,
                    'notes': None
                })
        else:
            # Get all user's video notes
            notes_list = VideoNotes.objects.filter(user=request.user).order_by('-updated_at')
            
            return Response({
                'success': True,
                'notes': [
                    {
                        'id': notes.id,
                        'video_id': notes.video_id,
                        'notes': notes.notes[:200] + '...' if len(notes.notes) > 200 else notes.notes,
                        'timestamps_count': len(notes.timestamps),
                        'created_at': notes.created_at,
                        'updated_at': notes.updated_at
                    }
                    for notes in notes_list
                ]
            })
            
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_notes(request, notes_id):
    """
    Download notes as a file
    
    GET /api/youtube/download-notes/{notes_id}/?format=txt|md|pdf
    """
    try:
        from django.http import HttpResponse
        from assessments.models import VideoNotes
        import io
        from datetime import datetime
        
        format_type = request.GET.get('format', 'txt')
        
        try:
            notes = VideoNotes.objects.get(id=notes_id, user=request.user)
        except VideoNotes.DoesNotExist:
            return Response({
                'error': 'Notes not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get video metadata for better formatting
        service = YouTubeTranscriptService()
        metadata = service.get_video_metadata(notes.video_id)
        
        if format_type == 'txt':
            content = f"""
YouTube Video Notes
==================

Video: {metadata.get('title', 'Unknown')}
Author: {metadata.get('author', 'Unknown')}
Video ID: {notes.video_id}
URL: https://www.youtube.com/watch?v={notes.video_id}

Notes Created: {notes.created_at.strftime('%Y-%m-%d %H:%M:%S')}
Last Updated: {notes.updated_at.strftime('%Y-%m-%d %H:%M:%S')}

NOTES:
------
{notes.notes}

TIMESTAMPED NOTES:
-----------------
"""
            for timestamp in notes.timestamps:
                time_formatted = f"{int(timestamp['time']//60):02d}:{int(timestamp['time']%60):02d}"
                content += f"\n[{time_formatted}] {timestamp['note']}"
            
            response = HttpResponse(content, content_type='text/plain')
            response['Content-Disposition'] = f'attachment; filename="notes_{notes.video_id}.txt"'
            
        elif format_type == 'md':
            content = f"""# YouTube Video Notes

## Video Information
- **Title:** {metadata.get('title', 'Unknown')}
- **Author:** {metadata.get('author', 'Unknown')}
- **Video ID:** {notes.video_id}
- **URL:** [Watch Video](https://www.youtube.com/watch?v={notes.video_id})
- **Notes Created:** {notes.created_at.strftime('%Y-%m-%d %H:%M:%S')}
- **Last Updated:** {notes.updated_at.strftime('%Y-%m-%d %H:%M:%S')}

## Notes

{notes.notes}

## Timestamped Notes

"""
            for timestamp in notes.timestamps:
                time_formatted = f"{int(timestamp['time']//60):02d}:{int(timestamp['time']%60):02d}"
                content += f"- **[{time_formatted}]** {timestamp['note']}\n"
            
            response = HttpResponse(content, content_type='text/markdown')
            response['Content-Disposition'] = f'attachment; filename="notes_{notes.video_id}.md"'
            
        else:  # Default to txt
            return Response({
                'error': 'Unsupported format. Use txt or md.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return response
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
