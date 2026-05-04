from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, LessonViewSet, UserProgressViewSet, PersonalSessionViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'progress', UserProgressViewSet, basename='progress')
router.register(r'personal-sessions', PersonalSessionViewSet, basename='personal-sessions')

urlpatterns = [
    path('', include(router.urls)),
]
