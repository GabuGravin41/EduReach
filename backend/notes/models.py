from django.db import models
from django.conf import settings
from courses.models import Lesson


class Note(models.Model):
    """A user's notes, attached to either a lesson or a curriculum unit."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='notes',
        null=True, blank=True,
    )
    unit = models.ForeignKey(
        'curriculum.Unit',
        on_delete=models.CASCADE,
        related_name='notes',
        null=True, blank=True,
    )
    content = models.TextField(blank=True, help_text='User notes content')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        target = self.lesson.title if self.lesson_id else (
            self.unit.name if self.unit_id else 'general')
        return f"{self.user.username} - {target}"

    class Meta:
        ordering = ['-updated_at']
