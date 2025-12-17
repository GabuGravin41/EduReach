"""
URL configuration for edureach_project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from services.youtube_service import extract_transcript

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/', include('users.urls')),
    path('api/', include('courses.urls')),
    path('api/', include('assessments.urls')),
    path('api/', include('community.urls')),
    path('api/study-groups/', include('study_groups.urls')),
    path('api/', include('ai_service.urls')),
    path('api/', include('notes.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/', include('api.urls')),  # YouTube and other API endpoints
    path('api/youtube/extract-transcript/', extract_transcript),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
