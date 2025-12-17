from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    StudyGroupViewSet,
    StudyGroupPostViewSet,
    StudyGroupChallengeViewSet,
    ChallengeParticipationViewSet,
)


router = DefaultRouter()
router.register(r'groups', StudyGroupViewSet, basename='study-group')
router.register(r'group-posts', StudyGroupPostViewSet, basename='study-group-post')
router.register(r'challenges', StudyGroupChallengeViewSet, basename='study-group-challenge')
router.register(r'participations', ChallengeParticipationViewSet, basename='challenge-participation')

urlpatterns = [
    path('', include(router.urls)),
]


