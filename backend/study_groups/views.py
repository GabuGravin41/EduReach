from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import StudyGroup, StudyGroupPost, StudyGroupChallenge, ChallengeParticipation
from .serializers import (
    StudyGroupSerializer,
    StudyGroupPostSerializer,
    StudyGroupChallengeSerializer,
    ChallengeParticipationSerializer,
)


class StudyGroupViewSet(viewsets.ModelViewSet):
    """
    Manage study groups.

    Key endpoints:
      - GET /api/study-groups/groups/               (list)
      - POST /api/study-groups/groups/              (create)
      - POST /api/study-groups/groups/<id>/join/    (join)
      - POST /api/study-groups/groups/<id>/leave/   (leave)
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = StudyGroupSerializer

    def get_queryset(self):
        qs = StudyGroup.objects.all()
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        group.members.add(self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        group = self.get_object()
        if group.members.filter(id=request.user.id).exists():
            return Response({'detail': 'Already a member.'}, status=status.HTTP_200_OK)
        if group.member_count >= group.max_members:
            return Response({'detail': 'Group is full.'}, status=status.HTTP_400_BAD_REQUEST)
        group.members.add(request.user)
        return Response({'detail': 'Joined group.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        group = self.get_object()
        if not group.members.filter(id=request.user.id).exists():
            return Response({'detail': 'Not a member.'}, status=status.HTTP_400_BAD_REQUEST)
        group.members.remove(request.user)
        return Response({'detail': 'Left group.'}, status=status.HTTP_200_OK)


class StudyGroupPostViewSet(viewsets.ModelViewSet):
    """
    Posts inside a study group.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = StudyGroupPostSerializer

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        qs = StudyGroupPost.models.none()  # type: ignore
        if group_id:
            qs = StudyGroupPost.objects.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        group_id = self.request.data.get('group')
        group = get_object_or_404(StudyGroup, id=group_id)
        if not group.members.filter(id=self.request.user.id).exists():
            raise permissions.PermissionDenied("You must be a member to post in this group.")
        serializer.save(author=self.request.user, group=group)


class StudyGroupChallengeViewSet(viewsets.ModelViewSet):
    """
    Challenges within a study group.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StudyGroupChallengeSerializer

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        qs = StudyGroupChallenge.objects.all()
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        group_id = self.request.data.get('group')
        group = get_object_or_404(StudyGroup, id=group_id)
        if group.creator != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Only group creators can create challenges.")
        serializer.save(group=group)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def leaderboard(self, request, pk=None):
        challenge = self.get_object()
        participations = challenge.participations.all().order_by('-score', '-last_updated')[:50]
        serializer = ChallengeParticipationSerializer(participations, many=True)
        return Response(serializer.data)


class ChallengeParticipationViewSet(viewsets.ModelViewSet):
    """
    Read-only for now; participation can be updated by backend logic (e.g., after grading).
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChallengeParticipationSerializer

    def get_queryset(self):
        return ChallengeParticipation.objects.filter(user=self.request.user)

# Create your views here.
