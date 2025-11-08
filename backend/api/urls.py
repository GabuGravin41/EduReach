"""
URL configuration for YouTube API endpoints
"""
from django.urls import path
from . import youtube_views

urlpatterns = [
    # YouTube transcript and metadata endpoints
    path('youtube/extract-transcript/', youtube_views.extract_youtube_transcript, name='extract_youtube_transcript'),
    path('youtube/video-info/', youtube_views.get_video_info, name='get_video_info'),
    path('youtube/save-notes/', youtube_views.save_video_notes, name='save_video_notes'),
    path('youtube/notes/', youtube_views.get_user_video_notes, name='get_user_video_notes'),
    path('youtube/download-notes/<int:notes_id>/', youtube_views.download_notes, name='download_notes'),
]
