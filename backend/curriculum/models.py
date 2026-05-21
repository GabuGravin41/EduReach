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
        GENERAL = 'general', 'General Course'

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
    topic_keywords = models.JSONField(
        default=list, blank=True,
        help_text=(
            'Assessment topic strings this unit maps to. The unit\'s past '
            'papers are the Assessment records whose topic matches one of '
            'these (case-insensitive).'
        ),
    )
    is_official = models.BooleanField(
        default=True,
        help_text='True for seeded/curated units; False for user-created units.',
    )
    is_public = models.BooleanField(
        default=False,
        help_text='True if this unit is discoverable by other users in Explore.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_units',
    )
    source_course = models.ForeignKey(
        'courses.Course', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='derived_units',
        help_text='The Course this unit was migrated from, if any.',
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


class PaperExtractionJob(models.Model):
    """Tracks a background PDF → past-paper extraction.

    A user uploads a PDF; a worker thread renders its pages, runs vision AI to
    extract questions and crop diagrams, and builds an Assessment attached to
    the unit. The frontend polls this row for status.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='paper_extraction_jobs',
    )
    unit = models.ForeignKey(
        Unit, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='extraction_jobs',
    )
    title = models.CharField(max_length=200, blank=True)
    pdf = models.FileField(upload_to='paper_uploads/')
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING,
    )
    progress = models.CharField(
        max_length=200, blank=True,
        help_text='Human-readable current step, shown to the user while waiting.',
    )
    assessment = models.ForeignKey(
        'assessments.Assessment', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'ExtractionJob #{self.pk} ({self.status})'


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
