from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string


class StudyGroupMembership(models.Model):
    """Through model for StudyGroup ↔ User with per-group roles."""

    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        TEACHER = 'teacher', 'Teacher'
        ADMIN = 'admin', 'Group Admin'

    group = models.ForeignKey(
        'StudyGroup',
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_group_memberships',
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    is_temp_account = models.BooleanField(
        default=False,
        help_text='True for bulk-created temporary contest accounts.',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['group', 'user']
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} ({self.role}) in {self.group.name}"


class StudyGroup(models.Model):
    """
    Collaborative learning group, optionally tied to a specific course.
    """

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_study_groups',
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='study_groups',
    )
    is_public = models.BooleanField(default=True)
    max_members = models.PositiveIntegerField(default=50)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='StudyGroupMembership',
        related_name='study_groups',
        blank=True,
    )
    # Token-based invite link (used for joining by URL, even for private groups).
    # Nullable so existing rows are not broken; tokens are generated lazily.
    invite_token = models.CharField(max_length=64, unique=True, blank=True, null=True)
    invite_enabled = models.BooleanField(
        default=True,
        help_text='If False, invite links for this group are disabled.',
    )
    
    # Bulk billing fields
    bulk_payment_active = models.BooleanField(
        default=False,
        help_text='If True, all members of this group inherit premium access.',
    )
    bulk_payment_expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Generate a stable random token the first time the group is saved,
        # without modifying existing groups that already have one.
        if not self.invite_token:
            self.invite_token = get_random_string(32)
        super().save(*args, **kwargs)

    @property
    def member_count(self) -> int:
        return self.members.count()


class StudyGroupPost(models.Model):
    """
    Posts/messages inside a study group.
    """

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='posts',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_group_posts',
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author} in {self.group}"


class StudyGroupChallenge(models.Model):
    """
    Lightweight challenge within a group, optionally linked to an assessment.
    """

    group = models.ForeignKey(
        StudyGroup,
        on_delete=models.CASCADE,
        related_name='challenges',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assessment = models.ForeignKey(
        'assessments.Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='group_challenges',
    )
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    is_public_listing = models.BooleanField(
        default=False,
        help_text='If True, this challenge appears in the platform Public challenges list for all users to discover.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.title} ({self.group.name})"


class ChallengeParticipation(models.Model):
    """
    Tracks each member's participation in a challenge.
    Used to power simple leaderboards.
    """

    challenge = models.ForeignKey(
        StudyGroupChallenge,
        on_delete=models.CASCADE,
        related_name='participations',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='challenge_participations',
    )
    score = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['challenge', 'user']
        ordering = ['-score', '-last_updated']

    def __str__(self):
        return f"{self.user} in {self.challenge}"

# Create your models here.
