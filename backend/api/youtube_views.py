"""
YouTube API Views for EduReach
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
import hashlib
import json

from services.youtube_service import YouTubeTranscriptService
from video_cache.models import VideoCache
from django.db.models import Q

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
        
        # Check database for pre-processed knowledge first
        from services.youtube_service import YouTubeTranscriptService
        service = YouTubeTranscriptService()
        video_id = service.extract_video_id(url)
        
        if video_id:
            db_cache = VideoCache.objects.filter(video_id=video_id, is_processed=True).first()
            if db_cache:
                return Response({
                    'success': True,
                    'cached': True,
                    'video_id': video_id,
                    'metadata': db_cache.metadata,
                    'transcript': db_cache.transcript,
                    'concepts': db_cache.concepts,
                    'relationships': db_cache.relationships,
                    'quizzes': db_cache.quizzes,
                    'source': 'database'
                })

        # Check Redis cache
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
                'chapters': result['chapters'],
                'fallbacks': result.get('transcript', {}).get('fallbacks', [])
            }
            cache.set(cache_key, cache_data, 3600)  # 1 hour
            
            return Response({
                'success': True,
                'cached': False,
                **cache_data
            })
        else:
            # Transcript extraction failed, but return 200 OK so frontend can handle gracefully
            # (user can still start session without transcript or provide it manually)
            failure_payload = {
                'success': False,
                'error': result.get('error', 'Could not extract transcript from this video'),
                'url': url,
                'video_id': result.get('video_id'),
                'transcript': {'transcript': '', 'segments': []},
                'fallbacks': result.get('transcript', {}).get('fallbacks', [])
            }
            # Include any server-side debug snapshot from YouTube fetches
            if result.get('server_debug'):
                failure_payload['_server'] = result.get('server_debug')

            # Return 200 OK instead of 422 - let frontend decide how to handle it
            return Response(failure_payload, status=status.HTTP_200_OK)
            
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
def test_transcripts(request):
    """
    Bulk-test transcript fetching for a list of YouTube URLs.

    POST /api/youtube/test-transcripts/
    {
        "urls": [
            "https://www.youtube.com/watch?v=...",
            "https://youtu.be/...",
            ...
        ]
    }

    Returns per-URL success/fail with the method used and word count.
    Useful for verifying that transcript fetching works in production.
    """
    urls = request.data.get('urls', [])
    if not urls or not isinstance(urls, list):
        return Response({'error': 'Provide a list of URLs in the "urls" field'}, status=status.HTTP_400_BAD_REQUEST)

    if len(urls) > 20:
        return Response({'error': 'Maximum 20 URLs per request'}, status=status.HTTP_400_BAD_REQUEST)

    service = YouTubeTranscriptService()
    results = []

    for url in urls:
        url = url.strip()
        video_id = service.extract_video_id(url)
        if not video_id:
            results.append({'url': url, 'video_id': None, 'success': False, 'error': 'Invalid YouTube URL'})
            continue

        try:
            result = service.extract_transcript(video_id)
            results.append({
                'url': url,
                'video_id': video_id,
                'success': result.get('success', False),
                'method': result.get('method'),
                'word_count': result.get('word_count', 0),
                'used_cookies': result.get('used_cookies', False),
                'error': result.get('error') if not result.get('success') else None,
                'fallbacks': result.get('fallbacks', [])
            })
        except Exception as e:
            results.append({'url': url, 'video_id': video_id, 'success': False, 'error': str(e)})

    total = len(results)
    succeeded = sum(1 for r in results if r['success'])

    return Response({
        'summary': {'total': total, 'succeeded': succeeded, 'failed': total - succeeded},
        'cookies_configured': bool(service.cookies_path),
        'results': results
    })


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_videos(request):
    """
    Search cached videos in VideoCache.

    GET /api/videos/search/?q=keyword&limit=20
    Returns: { results: [{url, title, video_id, transcript, thumbnail_url, channel_name}], total }
    """
    try:
        q = (request.GET.get('q') or '').strip()
        limit = int(request.GET.get('limit', 20))
        if limit <= 0 or limit > 100:
            limit = 20

        if not q:
            return Response({'results': [], 'total': 0})

        # Simple search across title, channel_name, and topic_tags
        qs = VideoCache.objects.filter(
            Q(title__icontains=q) | Q(channel_name__icontains=q) | Q(topic_tags__contains=[q])
        ).order_by('-fetched_at')[:limit]

        results = []
        for v in qs:
            vid = v.video_id
            thumb = f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg' if vid else None
            results.append({
                'url': v.url,
                'title': v.title,
                'video_id': v.video_id,
                'transcript': v.transcript_json or v.transcript,
                'thumbnail_url': thumb,
                'channel_name': v.channel_name,
            })

        return Response({'results': results, 'total': len(results)})
    except Exception as e:
        return Response({'error': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_ingest_video(request):
    """
    Admin-only: ingest a YouTube video by URL.
    Pulls transcript + metadata, AI-summarises to key concepts, and stores in VideoCache.

    POST /api/admin/youtube/ingest/
    { "url": "https://www.youtube.com/watch?v=...", "tags": ["physics", "kcse"] }
    """
    if not (request.user.is_staff or getattr(request.user, 'tier', None) == 'admin'):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    url = (request.data.get('url') or '').strip()
    if not url:
        return Response({'error': 'url is required.'}, status=status.HTTP_400_BAD_REQUEST)

    tags = request.data.get('tags') or []

    service = YouTubeTranscriptService()
    video_id = service.extract_video_id(url)
    if not video_id:
        return Response({'error': 'Could not parse a YouTube video ID from that URL.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if already ingested
    existing = VideoCache.objects.filter(video_id=video_id).first()
    if existing and existing.is_processed:
        existing.topic_tags = list(set((existing.topic_tags or []) + tags))
        existing.save(update_fields=['topic_tags'])
        return Response({
            'status': 'already_ingested',
            'video_id': video_id,
            'title': existing.title,
            'concepts': existing.concepts,
            'tags': existing.topic_tags,
        })

    # Pull transcript + metadata
    result = service.extract_complete_video_data(url)
    if not result.get('success'):
        return Response({'error': result.get('error', 'Failed to extract transcript.')}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    metadata = result.get('metadata') or {}
    transcript_payload = result.get('transcript') or {}
    raw_transcript = transcript_payload.get('transcript', '') if isinstance(transcript_payload, dict) else str(transcript_payload)
    title = metadata.get('title') or result.get('title') or video_id
    channel = metadata.get('author') or metadata.get('channel_name') or ''

    # AI concept extraction
    concepts = []
    summary = ''
    if raw_transcript:
        try:
            from ai_service.views import call_ai
            excerpt = raw_transcript[:4000]
            concept_prompt = (
                f"You are an educational content analyst. Extract the key educational concepts from this video transcript. "
                f"Video title: '{title}'. "
                f"Return a JSON object with two keys:\n"
                f"  'summary': a 2-3 sentence educational summary of the video\n"
                f"  'concepts': a list of up to 10 strings, each being a key concept or topic covered\n\n"
                f"Transcript excerpt:\n{excerpt}\n\nReturn only valid JSON, no markdown."
            )
            ai_text = call_ai(concept_prompt, max_tokens=600)
            import re as _re
            json_match = _re.search(r'\{.*\}', ai_text, _re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                concepts = parsed.get('concepts') or []
                summary = parsed.get('summary') or ''
        except Exception:
            pass

    # Upsert VideoCache
    cache_obj, _ = VideoCache.objects.update_or_create(
        video_id=video_id,
        defaults={
            'url': url,
            'title': title,
            'channel_name': channel,
            'transcript': raw_transcript,
            'transcript_json': transcript_payload if isinstance(transcript_payload, dict) else None,
            'metadata': metadata,
            'topic_tags': tags,
            'concepts': concepts,
            'is_processed': True,
        }
    )

    return Response({
        'status': 'ingested',
        'video_id': video_id,
        'title': title,
        'channel': channel,
        'summary': summary,
        'concepts': concepts,
        'tags': tags,
        'transcript_length': len(raw_transcript),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_ingested(request):
    """
    Admin-only: list all ingested VideoCache entries with pagination.

    GET /api/admin/youtube/ingested/?page=1&limit=20&q=keyword
    """
    if not (request.user.is_staff or getattr(request.user, 'tier', None) == 'admin'):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    q = (request.GET.get('q') or '').strip()
    limit = min(int(request.GET.get('limit', 20)), 100)
    page = max(int(request.GET.get('page', 1)), 1)
    offset = (page - 1) * limit

    qs = VideoCache.objects.all()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(channel_name__icontains=q))
    total = qs.count()
    items = qs[offset:offset + limit]

    data = []
    for v in items:
        vid = v.video_id
        data.append({
            'id': v.id,
            'video_id': vid,
            'url': v.url,
            'title': v.title,
            'channel_name': v.channel_name,
            'thumbnail_url': f'https://i.ytimg.com/vi/{vid}/mqdefault.jpg',
            'concepts': v.concepts or [],
            'topic_tags': v.topic_tags or [],
            'is_processed': v.is_processed,
            'transcript_length': len(v.transcript or ''),
            'fetched_at': v.fetched_at.isoformat() if v.fetched_at else None,
        })

    return Response({'results': data, 'total': total, 'page': page, 'limit': limit})
