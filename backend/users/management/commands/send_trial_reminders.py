"""
Management command: send_trial_reminders
-----------------------------------------
Sends in-app + email notifications to users whose free trial is expiring soon,
and to users whose trial just expired (for re-engagement).

Run daily via cron / Render scheduled job:
  python manage.py send_trial_reminders --send

Dry-run (safe, prints who would be notified):
  python manage.py send_trial_reminders
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


def _notif_model():
    from users.models import Notification
    return Notification


class Command(BaseCommand):
    help = 'Send trial expiry reminders (in-app + email) to users with trials ending soon.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send',
            action='store_true',
            default=False,
            help='Actually send notifications/emails (default is dry-run).',
        )

    def handle(self, *args, **options):
        send = options['send']
        app_url = getattr(settings, 'FRONTEND_URL', 'https://edureach.app')
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edureach.app')
        now = timezone.now()
        Notification = _notif_model()

        if not send:
            self.stdout.write(self.style.WARNING(
                'DRY RUN — pass --send to actually notify users.'
            ))

        total_notified = 0

        # ── 1. Trial ending in ~2 days ──────────────────────────────────────
        two_day_window_start = now + timedelta(days=1, hours=23)
        two_day_window_end = now + timedelta(days=2, hours=1)
        expiring_soon = User.objects.filter(
            is_trial_active=True,
            trial_ends_at__gte=two_day_window_start,
            trial_ends_at__lt=two_day_window_end,
            is_active=True,
        )

        self.stdout.write(f'Trial expiring in ~2 days: {expiring_soon.count()} users')

        for user in expiring_soon:
            name = user.first_name or user.username
            days_left = user.trial_days_remaining or 2

            if send:
                # In-app notification (skip if one was already sent today)
                already_notified = Notification.objects.filter(
                    recipient=user,
                    notif_type=Notification.NotifType.TRIAL_EXPIRING,
                    created_at__date=now.date(),
                ).exists()

                if not already_notified:
                    Notification.objects.create(
                        recipient=user,
                        notif_type=Notification.NotifType.TRIAL_EXPIRING,
                        title=f'⏰ {days_left} day{"s" if days_left != 1 else ""} left on your Pro trial',
                        message=(
                            f'Your free Pro trial ends in {days_left} day{"s" if days_left != 1 else ""}. '
                            'Upgrade now to keep unlimited AI tutoring, advanced assessments, and more.'
                        ),
                    )

                # Email
                if user.email:
                    try:
                        send_mail(
                            subject=f'⏰ {days_left} days left on your EduReach Pro trial, {name}!',
                            message=(
                                f'Hi {name},\n\n'
                                f'Your free EduReach Pro trial ends in {days_left} day{"s" if days_left != 1 else ""}.\n\n'
                                'After it expires, you will revert to the Free plan. '
                                'Upgrade now to keep access to:\n'
                                '  • Unlimited AI tutor conversations\n'
                                '  • Advanced assessments and proctoring\n'
                                '  • Full course library access\n'
                                '  • Detailed analytics\n\n'
                                f'Upgrade here:\n{app_url}/billing\n\n'
                                '— The EduReach Team'
                            ),
                            from_email=from_email,
                            recipient_list=[user.email],
                            fail_silently=False,
                        )
                        total_notified += 1
                        logger.info('Trial expiry reminder sent to user %s', user.id)
                    except Exception as exc:
                        logger.error('Failed to email %s: %s', user.email, exc)
            else:
                self.stdout.write(
                    f'  [DRY] Would notify {user.username} ({user.email}) — {days_left}d left'
                )

        # ── 2. Trial ending today (last-chance nudge) ───────────────────────
        today_window_start = now
        today_window_end = now + timedelta(hours=23)
        ending_today = User.objects.filter(
            is_trial_active=True,
            trial_ends_at__gte=today_window_start,
            trial_ends_at__lt=today_window_end,
            is_active=True,
        )

        self.stdout.write(f'Trial ending today: {ending_today.count()} users')

        for user in ending_today:
            name = user.first_name or user.username

            if send:
                already_notified = Notification.objects.filter(
                    recipient=user,
                    notif_type=Notification.NotifType.TRIAL_EXPIRING,
                    created_at__date=now.date(),
                ).exists()

                if not already_notified:
                    Notification.objects.create(
                        recipient=user,
                        notif_type=Notification.NotifType.TRIAL_EXPIRING,
                        title='🚨 Your Pro trial ends today!',
                        message=(
                            'Last chance — your free Pro trial expires today. '
                            'Upgrade now to keep all Pro features without interruption.'
                        ),
                    )

                if user.email:
                    try:
                        send_mail(
                            subject=f'🚨 Last chance — your EduReach Pro trial ends today, {name}!',
                            message=(
                                f'Hi {name},\n\n'
                                'Your free EduReach Pro trial ends TODAY.\n\n'
                                f'Upgrade before midnight to keep uninterrupted access:\n{app_url}/billing\n\n'
                                '— The EduReach Team'
                            ),
                            from_email=from_email,
                            recipient_list=[user.email],
                            fail_silently=False,
                        )
                        total_notified += 1
                    except Exception as exc:
                        logger.error('Failed to email %s: %s', user.email, exc)
            else:
                self.stdout.write(f'  [DRY] Would notify {user.username} — ends today')

        # ── 3. Re-engagement: trial expired 1 day ago, not yet upgraded ─────
        yesterday_start = now - timedelta(days=2)
        yesterday_end = now - timedelta(days=1)
        just_expired = User.objects.filter(
            is_trial_active=False,
            trial_started_at__isnull=False,
            trial_ends_at__gte=yesterday_start,
            trial_ends_at__lt=yesterday_end,
            tier='free',
            is_active=True,
        )

        self.stdout.write(f'Trial just expired (not upgraded): {just_expired.count()} users')

        for user in just_expired:
            name = user.first_name or user.username
            if send and user.email:
                try:
                    send_mail(
                        subject=f'Your EduReach Pro trial ended — here\'s how to keep going, {name}',
                        message=(
                            f'Hi {name},\n\n'
                            'Your EduReach Pro trial has ended. We hope you enjoyed the experience!\n\n'
                            'To continue with unlimited AI tutoring, advanced assessments, and more, '
                            f'upgrade to a paid plan here:\n{app_url}/billing\n\n'
                            'Plans start from a very affordable price. Keep your learning momentum going!\n\n'
                            '— The EduReach Team'
                        ),
                        from_email=from_email,
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                    total_notified += 1
                except Exception as exc:
                    logger.error('Failed to email %s: %s', user.email, exc)
            elif not send:
                self.stdout.write(f'  [DRY] Would re-engage {user.username} ({user.email})')

        if send:
            self.stdout.write(self.style.SUCCESS(f'\nDone. {total_notified} notifications sent.'))
        else:
            self.stdout.write(self.style.NOTICE('\nDry run complete. Run with --send to notify users.'))
