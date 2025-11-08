from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, QuestionViewSet, UserAttemptViewSet

router = DefaultRouter()
router.register(r'assessments', AssessmentViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'attempts', UserAttemptViewSet, basename='attempts')

urlpatterns = [
    path('', include(router.urls)),
]
