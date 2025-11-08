from django.db import models
from django.conf import settings


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
