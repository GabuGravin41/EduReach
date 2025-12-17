from django.db import models
from django.conf import settings
from django.utils import timezone


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
        related_name='study_groups',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

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
