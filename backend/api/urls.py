"""
URL configuration for YouTube API endpoints and analytics endpoints.
"""
from django.urls import path
from . import youtube_views
from . import analytics_views
from . import recommendations_views

urlpatterns = [
    # YouTube transcript and metadata endpoints
    path('youtube/extract-transcript/', youtube_views.extract_youtube_transcript, name='extract_youtube_transcript'),
    path('youtube/video-info/', youtube_views.get_video_info, name='get_video_info'),
    path('youtube/test-transcripts/', youtube_views.test_transcripts, name='test_transcripts'),
    path('youtube/save-notes/', youtube_views.save_video_notes, name='save_video_notes'),
    path('youtube/notes/', youtube_views.get_user_video_notes, name='get_user_video_notes'),
    path('youtube/download-notes/<int:notes_id>/', youtube_views.download_notes, name='download_notes'),
    # Video cache search
    path('videos/search/', youtube_views.search_videos, name='video_search'),

    # Admin YouTube ingestion
    path('admin/youtube/ingest/', youtube_views.admin_ingest_video, name='admin_ingest_video'),
    path('admin/youtube/ingested/', youtube_views.admin_list_ingested, name='admin_list_ingested'),

    # Personalised recommendations
    path('recommendations/', recommendations_views.recommendations, name='recommendations'),

    # Analytics endpoints
    path('analytics/track/', analytics_views.track_visit, name='track_visit'),
    path('analytics/learner/', analytics_views.learner_analytics, name='learner_analytics'),
    path('analytics/instructor/', analytics_views.instructor_analytics, name='instructor_analytics'),
    path('analytics/admin/', analytics_views.admin_analytics, name='admin_analytics'),
]
