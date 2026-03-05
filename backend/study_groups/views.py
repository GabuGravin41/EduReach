from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models

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
        """
        Visibility rules:
          - Anonymous users: only see public groups.
          - Authenticated users: see
              * public groups
              * groups they created
              * groups they are a member of
        """
        qs = StudyGroup.objects.all()

        user = getattr(self.request, 'user', None)
        if not user or not user.is_authenticated:
            qs = qs.filter(is_public=True)
        else:
            qs = qs.filter(
                models.Q(is_public=True)
                | models.Q(creator=user)
                | models.Q(members=user)
            ).distinct()

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

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def members(self, request, pk=None):
        """List members of a study group."""
        group = self.get_object()
        members = group.members.all()
        data = [{'id': m.id, 'username': m.username, 'first_name': getattr(m, 'first_name', ''), 'last_name': getattr(m, 'last_name', '')} for m in members]
        return Response(data)

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='assessment-performance',
    )
    def assessment_performance(self, request, pk=None):
        """
        Aggregate assessment performance for members of this group.

        Looks at all assessments linked via StudyGroupChallenge for this group,
        then aggregates graded UserAttempt scores for group members.
        """
        group = self.get_object()

        from assessments.models import Assessment, UserAttempt  # lazy import to avoid circulars

        member_ids = list(group.members.values_list('id', flat=True))
        if not member_ids:
            return Response([])

        assessments = Assessment.objects.filter(
            group_challenges__group=group,
        ).distinct()
        if not assessments.exists():
            return Response([])

        attempts_qs = UserAttempt.objects.filter(
            assessment__in=assessments,
            user_id__in=member_ids,
            status=UserAttempt.Status.GRADED,
        ).select_related('user', 'assessment')

        by_user = {}
        for attempt in attempts_qs:
            u = attempt.user
            key = u.id
            if key not in by_user:
                full_name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
                by_user[key] = {
                    'user_id': u.id,
                    'username': u.username,
                    'full_name': full_name or u.username,
                    'attempts': [],
                }
            by_user[key]['attempts'].append(
                {
                    'assessment_id': attempt.assessment_id,
                    'assessment_title': attempt.assessment.title,
                    'percentage': attempt.percentage,
                    'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                }
            )

        results = []
        for entry in by_user.values():
            attempts = entry['attempts']
            if attempts:
                valid_percentages = [a['percentage'] for a in attempts if a['percentage'] is not None]
                avg = sum(valid_percentages) / len(valid_percentages) if valid_percentages else 0.0
                entry['attempt_count'] = len(attempts)
                entry['average_percentage'] = round(avg, 2)
            else:
                entry['attempt_count'] = 0
                entry['average_percentage'] = 0.0
            results.append(entry)

        return Response(results)

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='join-by-token',
    )
    def join_by_token(self, request):
        """
        Join a study group by invite token (bypasses visibility rules).
        
        Request body:
          - token: str (the invite_token from the group)
        
        Returns:
          - group_id: int (the group the user joined)
          - detail: str (success message)
        """
        token = request.data.get('token')
        if not token:
            return Response(
                {'detail': 'token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            group = StudyGroup.objects.get(invite_token=token)
        except StudyGroup.DoesNotExist:
            return Response(
                {'detail': 'Invite link is invalid or expired.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Check if invites are enabled for this group
        if not group.invite_enabled:
            return Response(
                {'detail': 'This invite link is disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # Check capacity
        if group.member_count >= group.max_members:
            return Response(
                {'detail': 'Group is full.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Check if already a member
        if group.members.filter(id=request.user.id).exists():
            return Response(
                {'detail': 'Already a member.', 'group_id': group.id},
                status=status.HTTP_200_OK,
            )
        
        # Add user to group
        group.members.add(request.user)
        
        return Response(
            {'detail': 'Joined group.', 'group_id': group.id},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def invite(self, request, pk=None):
        """Invite a user to the study group by email (adds existing user)."""
        group = self.get_object()
        if group.creator != request.user and not request.user.is_staff:
            return Response({'detail': 'Only group creators can invite members.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        if not email:
            return Response({'detail': 'email is required'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'User with that email not found.'}, status=status.HTTP_404_NOT_FOUND)

        if group.members.filter(id=user.id).exists():
            return Response({'detail': 'User already a member.'}, status=status.HTTP_200_OK)

        if group.member_count >= group.max_members:
            return Response({'detail': 'Group is full.'}, status=status.HTTP_400_BAD_REQUEST)

        group.members.add(user)
        return Response({'detail': 'User added to group.'}, status=status.HTTP_200_OK)


class StudyGroupPostViewSet(viewsets.ModelViewSet):
    """
    Posts inside a study group.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = StudyGroupPostSerializer

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        qs = StudyGroupPost.objects.none()  # type: ignore
        if group_id:
            qs = StudyGroupPost.objects.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        group_id = self.request.data.get('group')
        group = get_object_or_404(StudyGroup, id=group_id)
        if not group.members.filter(id=self.request.user.id).exists():
            raise permissions.PermissionDenied("You must be a member to post in this group.")
        serializer.save(author=self.request.user, group=group)

    def perform_update(self, serializer):
        # Allow only author or group creator or staff to update
        instance = serializer.instance
        if instance.author != self.request.user and instance.group.creator != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("You cannot edit this post.")
        serializer.save()

    def perform_destroy(self, instance):
        # Allow only author or group creator or staff to delete
        if instance.author != self.request.user and instance.group.creator != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("You cannot delete this post.")
        instance.delete()


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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def participate(self, request, pk=None):
        """Join or update participation in a challenge."""
        challenge = self.get_object()
        score = request.data.get('score', 0)
        completed = request.data.get('completed', False)

        participation, created = ChallengeParticipation.objects.update_or_create(
            challenge=challenge,
            user=request.user,
            defaults={
                'score': score,
                'completed': completed
            }
        )

        serializer = ChallengeParticipationSerializer(participation)
        return Response({'created': created, 'participation': serializer.data})


class ChallengeParticipationViewSet(viewsets.ModelViewSet):
    """
    Read-only for now; participation can be updated by backend logic (e.g., after grading).
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChallengeParticipationSerializer

    def get_queryset(self):
        return ChallengeParticipation.objects.filter(user=self.request.user)

# Create your views here.
