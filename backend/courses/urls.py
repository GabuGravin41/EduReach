from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, LessonViewSet, UserProgressViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'progress', UserProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
]
