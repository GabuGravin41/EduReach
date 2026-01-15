from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Course


@receiver(post_save, sender=Course)
def create_course_channel(sender, instance, created, **kwargs):
    """Auto-create a discussion channel for each new course."""
    if created:
        # Import here to avoid circular imports
        from community.models import CourseChannel

        CourseChannel.objects.get_or_create(course=instance)
