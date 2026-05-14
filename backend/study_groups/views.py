from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models

from .models import StudyGroup, StudyGroupMembership, StudyGroupPost, StudyGroupChallenge, ChallengeParticipation
from .serializers import (
    StudyGroupSerializer,
    StudyGroupPostSerializer,
    StudyGroupChallengeSerializer,
    ChallengeParticipationSerializer,
)
from users.models import Notification


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

    # ── Tier limits ──────────────────────────────────────────────────────────
    # free    : cannot create; can join up to 2
    # starter : can create up to 3; can join up to 7 (total memberships)
    # pro/admin: unlimited
    TIER_CREATE_LIMITS = {'free': 0, 'starter': 3, 'pro': None, 'admin': None}
    TIER_JOIN_LIMITS   = {'free': 2, 'starter': 7, 'pro': None, 'admin': None}

    def _check_create_limit(self, user):
        if user.is_staff:
            return
        tier = getattr(user, 'tier', 'free') or 'free'
        limit = self.TIER_CREATE_LIMITS.get(tier, 0)
        if limit == 0:
            raise permissions.PermissionDenied(
                'Free accounts cannot create study groups. Upgrade to Starter or Pro.'
            )
        if limit is not None:
            count = StudyGroup.objects.filter(creator=user).count()
            if count >= limit:
                raise permissions.PermissionDenied(
                    f'Starter accounts can create up to {limit} study groups. Upgrade to Pro for unlimited.'
                )

    def _check_join_limit(self, user):
        if user.is_staff:
            return
        tier = getattr(user, 'tier', 'free') or 'free'
        limit = self.TIER_JOIN_LIMITS.get(tier)
        if limit is not None:
            count = StudyGroupMembership.objects.filter(user=user).count()
            if count >= limit:
                tier_label = tier.capitalize()
                next_tier = 'Starter or Pro' if tier == 'free' else 'Pro'
                raise permissions.PermissionDenied(
                    f'{tier_label} accounts can be in up to {limit} study groups. Upgrade to {next_tier} for more.'
                )

    def perform_create(self, serializer):
        self._check_create_limit(self.request.user)
        group = serializer.save(creator=self.request.user)
        StudyGroupMembership.objects.create(
            group=group,
            user=self.request.user,
            role=StudyGroupMembership.Role.TEACHER,
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        group = self.get_object()
        if group.members.filter(id=request.user.id).exists():
            return Response({'detail': 'Already a member.'}, status=status.HTTP_200_OK)
        if group.member_count >= group.max_members:
            return Response({'detail': 'Group is full.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            self._check_join_limit(request.user)
        except permissions.PermissionDenied as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        StudyGroupMembership.objects.get_or_create(
            group=group,
            user=request.user,
            defaults={'role': StudyGroupMembership.Role.STUDENT},
        )
        return Response({'detail': 'Joined group.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        group = self.get_object()
        if not group.members.filter(id=request.user.id).exists():
            return Response({'detail': 'Not a member.'}, status=status.HTTP_400_BAD_REQUEST)
        StudyGroupMembership.objects.filter(group=group, user=request.user).delete()
        return Response({'detail': 'Left group.'}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        if instance.creator != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Only the group creator can delete this group.")
        instance.delete()

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def members(self, request, pk=None):
        """List members of a study group with their roles."""
        group = self.get_object()
        memberships = group.memberships.select_related('user').all()
        data = [
            {
                'id': ms.user.id,
                'username': ms.user.username,
                'first_name': getattr(ms.user, 'first_name', ''),
                'last_name': getattr(ms.user, 'last_name', ''),
                'role': ms.role,
                'is_temp_account': ms.is_temp_account,
                'joined_at': ms.joined_at.isoformat(),
            }
            for ms in memberships
        ]
        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_role(self, request, pk=None):
        """Return the current user's role in this group."""
        group = self.get_object()
        try:
            ms = StudyGroupMembership.objects.get(group=group, user=request.user)
            return Response({'role': ms.role, 'is_member': True})
        except StudyGroupMembership.DoesNotExist:
            return Response({'role': None, 'is_member': False})

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='bulk-enroll',
    )
    def bulk_enroll(self, request, pk=None):
        """
        Create temporary contest accounts and enroll them in the group.
        Only group teachers/creators can call this.

        Request body:
          - count: int (number of temp accounts to create, max 200)
          - prefix: str (username prefix, e.g. "contest2024")

        Returns list of created credentials: [{username, password}, ...]
        """
        group = self.get_object()

        try:
            ms = StudyGroupMembership.objects.get(group=group, user=request.user)
            is_teacher = ms.role in [StudyGroupMembership.Role.TEACHER, StudyGroupMembership.Role.ADMIN]
        except StudyGroupMembership.DoesNotExist:
            is_teacher = False

        if not is_teacher and not request.user.is_staff:
            return Response({'detail': 'Only group teachers can bulk-enroll.'}, status=status.HTTP_403_FORBIDDEN)

        count = int(request.data.get('count', 0))
        prefix = request.data.get('prefix', 'tmp')

        if count < 1 or count > 200:
            return Response({'detail': 'count must be between 1 and 200.'}, status=status.HTTP_400_BAD_REQUEST)

        if group.member_count + count > group.max_members:
            return Response(
                {'detail': f'Would exceed group max of {group.max_members} members.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.contrib.auth import get_user_model
        from django.utils.crypto import get_random_string
        User = get_user_model()

        created_accounts = []
        for i in range(count):
            username = f"{prefix}_{get_random_string(6)}"
            password = get_random_string(10)
            while User.objects.filter(username=username).exists():
                username = f"{prefix}_{get_random_string(6)}"

            user = User.objects.create_user(username=username, password=password)
            StudyGroupMembership.objects.create(
                group=group,
                user=user,
                role=StudyGroupMembership.Role.STUDENT,
                is_temp_account=True,
            )
            created_accounts.append({'username': username, 'password': password})

        return Response({'created': len(created_accounts), 'accounts': created_accounts})

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

        # Include ALL graded attempts by group members (not just challenge-linked ones)
        attempts_qs = UserAttempt.objects.filter(
            user_id__in=member_ids,
            status=UserAttempt.Status.GRADED,
        ).select_related('user', 'assessment').order_by('-submitted_at')

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

        # Tier join limit
        try:
            self._check_join_limit(request.user)
        except permissions.PermissionDenied as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        # Add user to group
        StudyGroupMembership.objects.get_or_create(
            group=group,
            user=request.user,
            defaults={'role': StudyGroupMembership.Role.STUDENT},
        )

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

        StudyGroupMembership.objects.get_or_create(
            group=group,
            user=user,
            defaults={'role': StudyGroupMembership.Role.STUDENT},
        )
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
        challenge = serializer.save(group=group)

        # Send notifications to all group members except the creator
        assessment_title = challenge.assessment.title if challenge.assessment else 'Open Challenge'
        for member in group.members.exclude(id=self.request.user.id):
            Notification.objects.create(
                recipient=member,
                sender=self.request.user,
                notif_type='challenge',
                title=f'New Challenge: {challenge.title}',
                message=f'{self.request.user.username} started a new challenge in {group.name}: {assessment_title}',
                assessment_id=challenge.assessment_id,
                share_token=challenge.assessment.share_token if challenge.assessment else '',
            )

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

    @action(detail=True, methods=['patch'], url_path='release-results', permission_classes=[permissions.IsAuthenticated])
    def release_results(self, request, pk=None):
        challenge = self.get_object()
        group = challenge.group
        if request.user != group.creator and not group.memberships.filter(user=request.user, role__in=['teacher', 'admin']).exists():
            return Response({'detail': 'Only the group creator or teacher can release results.'}, status=403)
        challenge.results_released = not challenge.results_released  # toggle
        challenge.save(update_fields=['results_released'])
        return Response({'results_released': challenge.results_released})

    @action(detail=True, methods=['get'], url_path='submissions', permission_classes=[permissions.IsAuthenticated])
    def submissions(self, request, pk=None):
        challenge = self.get_object()
        group = challenge.group
        if request.user != group.creator and not group.memberships.filter(user=request.user, role__in=['teacher', 'admin']).exists():
            return Response({'detail': 'Only the group creator or teacher can view submissions.'}, status=403)
        if not challenge.assessment:
            return Response([])
        from assessments.models import UserAttempt
        from assessments.serializers import UserAttemptSerializer
        attempts = UserAttempt.objects.filter(assessment=challenge.assessment).select_related('user').order_by('-submitted_at')
        return Response(UserAttemptSerializer(attempts, many=True).data)


class ChallengeParticipationViewSet(viewsets.ModelViewSet):
    """
    Read-only for now; participation can be updated by backend logic (e.g., after grading).
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChallengeParticipationSerializer

    def get_queryset(self):
        return ChallengeParticipation.objects.filter(user=self.request.user)

# Create your views here.
