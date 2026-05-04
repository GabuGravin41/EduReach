from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def start_trial_for_new_user(sender, instance, created, **kwargs):
    """Automatically start 1-month free Pro trial for new users."""
    if created and not instance.is_superuser and not instance.is_staff:
        # Start trial for new regular users only
        instance.start_free_trial()


@receiver(post_save, sender='users.Notification')
def push_on_notification_created(sender, instance, created, **kwargs):
    """
    Fire a Web Push notification whenever a new in-app Notification is created.
    This is the single hook that means every Notification.objects.create()
    (payment, trial, challenge, XP level-up, study reminder…) automatically
    pushes to the user's device if they've subscribed.
    Runs synchronously but is fast — pywebpush is non-blocking at small scale.
    Fails silently so a push outage never breaks the normal request path.
    """
    if not created:
        return
    try:
        from .push_notifications import push_to_user  # noqa: PLC0415
        from django.conf import settings  # noqa: PLC0415
        app_url = getattr(settings, 'FRONTEND_URL', 'https://edureach.app')

        # Build a deep-link URL based on notification type
        notif_type = instance.notif_type
        url_map = {
            'trial_started': '/billing',
            'trial_expiring': '/billing',
            'trial_expired': '/billing',
            'payment_success': '/billing',
            'payment_failed': '/billing',
            'level_up': '/profile',
            'study_reminder': '/',
            'challenge': f'/assessments/{instance.assessment_id}' if instance.assessment_id else '/assessments',
            'assessment_graded': f'/assessments/{instance.assessment_id}' if instance.assessment_id else '/assessments',
            'missing_transcript': '/courses',
            'system': '/',
        }
        url = url_map.get(notif_type, '/')

        push_to_user(
            instance.recipient,
            title=instance.title,
            body=instance.message[:120],  # Keep push body concise
            url=url,
            tag=f'notif-{notif_type}-{instance.id}',
        )
    except Exception:  # noqa: BLE001
        pass  # Never let a push failure break the notification save
