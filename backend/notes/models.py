from django.db import models
from django.conf import settings
from courses.models import Lesson


class Note(models.Model):
    """Model for user notes on lessons."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    content = models.TextField(blank=True, help_text='User notes content')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"

    class Meta:
        unique_together = ['user', 'lesson']
        ordering = ['-updated_at']
