from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

from payments.models import Payment


class Course(models.Model):
    """Model for courses."""
    title = models.CharField(max_length=200)
    description = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_courses'
    )
    thumbnail = models.ImageField(
        upload_to='course_thumbnails/',
        null=True,
        blank=True
    )
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']


class Lesson(models.Model):
    """Model for lessons within courses."""
    course = models.ForeignKey(
        Course,
        related_name='lessons',
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=200)
    video_id = models.CharField(max_length=50, help_text='YouTube Video ID')
    video_url = models.URLField(max_length=500, blank=True, help_text='Full YouTube URL')
    duration = models.CharField(max_length=20, default='N/A')
    order = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    
    # Transcript fields
    transcript = models.TextField(blank=True, help_text='Auto-fetched or manually entered transcript')
    transcript_language = models.CharField(max_length=10, default='en', help_text='Transcript language code')
    manual_transcript = models.TextField(blank=True, help_text='Manually pasted transcript as fallback')
    transcript_fetched_at = models.DateTimeField(null=True, blank=True, help_text='When transcript was last fetched')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.course.title} - {self.title}"
    
    def get_transcript(self):
        """Get transcript, preferring auto-fetched over manual."""
        return self.transcript or self.manual_transcript
    
    def get_all_related_assessments(self):
        """Get all assessments related to this lesson (generated + tagged)."""
        from assessments.models import Assessment
        generated = self.generated_assessments.all()
        related = self.related_assessments.all()
        # Combine and remove duplicates
        all_assessments = list(generated) + [a for a in related if a not in generated]
        return all_assessments

    class Meta:
        ordering = ['order']
        unique_together = ['course', 'order']


class UserProgress(models.Model):
    """Model for tracking user progress in courses."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_progress'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    completed_lessons = models.ManyToManyField(Lesson, blank=True)
    progress_percentage = models.IntegerField(default=0)
    last_accessed = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-last_accessed']

    def update_progress(self):
        """Calculate and update progress percentage."""
        total_lessons = self.course.lessons.count()
        if total_lessons > 0:
            completed = self.completed_lessons.count()
            self.progress_percentage = int((completed / total_lessons) * 100)
            self.save()


class CoursePricing(models.Model):
    """Pricing and monetization settings for a course."""

    course = models.OneToOneField(Course, related_name='pricing', on_delete=models.CASCADE)
    is_paid = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='KES')
    free_preview_lessons = models.PositiveIntegerField(default=1)
    allow_tips = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pricing for {self.course.title}"

    @property
    def amount(self) -> Decimal:
        return self.price if self.is_paid else Decimal('0')


class ContentPurchase(models.Model):
    """Tracks paid unlocks per user/course."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='content_purchases'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='purchases'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='content_purchases')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} purchased {self.course}"


class CreatorTip(models.Model):
    """Tips from learners to creators."""

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tips_sent'
    )
    to_creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tips_received'
    )
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='tips')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    message = models.CharField(max_length=280, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='tips')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Tip {self.amount} {self.currency} from {self.from_user} to {self.to_creator}"


class CreatorEarnings(models.Model):
    """Aggregated revenue per creator/month."""

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earnings'
    )
    month = models.DateField()
    gross_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    courses_sold = models.PositiveIntegerField(default=0)
    tips_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['creator', 'month']
        ordering = ['-month']

    def __str__(self):
        return f"{self.creator} earnings {self.month}"

    @staticmethod
    def month_start(dt=None):
        dt = dt or timezone.now()
        return timezone.datetime(dt.year, dt.month, 1, tzinfo=dt.tzinfo or timezone.utc)
