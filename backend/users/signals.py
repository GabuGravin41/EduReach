from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def start_trial_for_new_user(sender, instance, created, **kwargs):
    """Automatically start 1-month free Pro trial for new users."""
    if created and not instance.is_superuser and not instance.is_staff:
        # Start trial for new regular users only
        instance.start_free_trial()
