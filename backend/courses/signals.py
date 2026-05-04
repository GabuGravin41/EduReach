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


def notify_admin_missing_transcript(lesson):
    """
    Send an in-app notification to all admin/superusers and an email to the
    platform address when a YouTube lesson is created without a transcript.

    Call this after all auto-fetch attempts have been exhausted.
    Silently swallows errors so a notification failure never breaks lesson creation.
    """
    try:
        from django.contrib.auth import get_user_model
        from django.core.mail import send_mail
        from django.conf import settings
        from users.models import Notification

        User = get_user_model()
        admins = User.objects.filter(is_superuser=True)

        title = f'Missing transcript: "{lesson.title}"'
        message = (
            f'A new YouTube lesson was added without a transcript.\n\n'
            f'Course: {lesson.course.title}\n'
            f'Lesson: {lesson.title}\n'
            f'Video ID: {lesson.video_id}\n'
            f'YouTube URL: https://www.youtube.com/watch?v={lesson.video_id}\n\n'
            f'To add the transcript, run fetch_transcripts_local.py on your local '
            f'machine and then upload with:\n'
            f'  python manage.py load_transcripts_from_file /tmp/transcripts.json\n\n'
            f'Or paste a manual transcript via the course editor on the platform.'
        )

        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                notif_type=Notification.NotifType.MISSING_TRANSCRIPT,
                title=title,
                message=message,
            )

        admin_email = getattr(settings, 'ENTERPRISE_INQUIRY_EMAIL', None) or getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        if '@' in admin_email:
            send_mail(
                subject=f'[EduReach] Missing transcript — {lesson.title}',
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin_email],
                fail_silently=True,
            )

    except Exception:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            'notify_admin_missing_transcript failed for lesson %s', lesson.id, exc_info=True
        )
