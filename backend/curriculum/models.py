from django.conf import settings
from django.db import models


class Unit(models.Model):
    """A focused study area — a university course unit or an olympiad topic.

    The same primitive serves both audiences: engineering students enrol in
    course units (e.g. "Electrical Machines 3"), olympiad trainees enrol in
    topic areas (e.g. "Combinatorics"). The syllabus_summary is injected into
    AI prompts so the tutor and quiz generator actually understand the unit.
    """

    class Track(models.TextChoices):
        ENGINEERING = 'engineering', 'University / Engineering'
        OLYMPIAD = 'olympiad', 'Olympiad Training'

    track = models.CharField(max_length=20, choices=Track.choices, db_index=True)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=30, blank=True, db_index=True)
    institution = models.CharField(max_length=200, blank=True)
    level = models.CharField(
        max_length=80, blank=True,
        help_text='e.g. "Year 3, Semester 1" or "National".',
    )
    syllabus_summary = models.TextField(
        help_text=(
            'Topics this unit covers. Injected into AI prompts so the tutor '
            'and quiz generator understand the unit instead of producing '
            'placeholder text.'
        ),
    )
    description = models.CharField(max_length=300, blank=True)
    is_official = models.BooleanField(
        default=True,
        help_text='True for seeded/curated units; False for user-created units.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_units',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['track', 'code', 'name']

    def __str__(self):
        return f'{self.code} {self.name}'.strip()

    def ai_context(self) -> str:
        """A compact context string for injection into AI system prompts."""
        where = f' at {self.institution}' if self.institution else ''
        level = f' ({self.level})' if self.level else ''
        return (
            f'The student is studying "{self.name}"{level}{where}. '
            f'This unit covers: {self.syllabus_summary}'
        )


class UserEnrolledUnit(models.Model):
    """A unit a user is currently studying this semester / training programme."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='enrolled_units',
    )
    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE, related_name='enrollments',
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'unit')]
        ordering = ['-enrolled_at']

    def __str__(self):
        return f'{self.user.username} → {self.unit}'
