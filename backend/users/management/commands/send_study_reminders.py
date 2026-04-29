"""
Management command: send_study_reminders
-----------------------------------------
Sends motivational study-reminder emails + Web Push + in-app notifications
to users who haven't logged in recently (Duolingo-style nudges).

Tiers of inactivity:
  - 3 days:  gentle nudge  ("We miss you!")
  - 7 days:  stronger push ("Your streak is at risk!")
  - 14 days: re-engagement ("Come back and pick up where you left off")

Users with no email address are skipped for email but still receive push/in-app.

Usage:
  python manage.py send_study_reminders                    # dry run (no emails sent)
  python manage.py send_study_reminders --send             # actually send
  python manage.py send_study_reminders --send --days 3    # only 3-day tier

Schedule via cron (daily at 9 AM):
  0 9 * * * /path/to/venv/bin/python /path/to/manage.py send_study_reminders --send
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

REMINDER_TIERS = [
    {
        'days': 3,
        'push_title': '📚 Time to study, {name}!',
        'push_body': "It's been {days} days — even 10 minutes today keeps the momentum alive!",
        'subject': '📚 Your learning adventure awaits, {name}!',
        'body': (
            'Hi {name},\n\n'
            "It's been {days} days since you last studied on EduReach — don't let all that momentum slip away!\n\n"
            'Even 10 minutes a day compounds into massive progress over time. Log back in and keep your streak alive:\n\n'
            '{url}\n\n'
            'Your courses and assessments are right where you left them.\n\n'
            '— The EduReach Team 🌟\n'
        ),
    },
    {
        'days': 7,
        'push_title': '🔥 Your streak is at risk, {name}!',
        'push_body': "A whole week without studying! Log back in today and pick up where you left off.",
        'subject': '🔥 Your streak is at risk, {name}!',
        'body': (
            'Hi {name},\n\n'
            "A whole week without studying! That's okay — life gets busy. But your learning journey needs you.\n\n"
            'You have courses and assessments waiting for you. Log back in today:\n\n'
            '{url}\n\n'
            '"The secret of getting ahead is getting started." — Mark Twain\n\n'
            '— The EduReach Team\n'
        ),
    },
    {
        'days': 14,
        'push_title': '👋 We miss you on EduReach!',
        'push_body': "It's been two weeks. Start with just 5 minutes today — your courses are waiting.",
        'subject': '👋 We miss you on EduReach, {name}!',
        'body': (
            'Hi {name},\n\n'
            "It's been two weeks! Your courses and assessments are still here, patiently waiting.\n\n"
            "We know re-starting can feel hard. So start small — just 5 minutes today. "
            "Open one question, watch one video segment. That's it.\n\n"
            'Come back:\n\n'
            '{url}\n\n'
            "We're cheering for you.\n\n"
            '— The EduReach Team\n'
        ),
    },
]


class Command(BaseCommand):
    help = 'Send study reminder emails + push notifications to inactive users.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send',
            action='store_true',
            default=False,
            help='Actually send notifications (default is dry-run).',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=0,
            help='Only send the reminder for this specific inactivity tier (3, 7, or 14). 0 = all tiers.',
        )

    def handle(self, *args, **options):
        send = options['send']
        only_days = options['days']
        app_url = getattr(settings, 'FRONTEND_URL', 'https://edureach.app')
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edureach.app')
        now = timezone.now()

        # Import here to avoid circular imports at module load time
        from users.models import Notification
        from users.push_notifications import push_to_user

        if not send:
            self.stdout.write(
                self.style.WARNING('DRY RUN — no notifications will be sent. Pass --send to actually send.')
            )

        total_sent = 0

        for tier in REMINDER_TIERS:
            days = tier['days']
            if only_days and days != only_days:
                continue

            # Users whose last login was between `days` and `days + 1` ago
            # (so we only hit each tier once per day, not repeatedly)
            lower = now - timedelta(days=days + 1)
            upper = now - timedelta(days=days)

            candidates = User.objects.filter(
                last_login__gte=lower,
                last_login__lt=upper,
                is_active=True,
            )

            count = candidates.count()
            self.stdout.write(f'Tier {days}d: {count} users eligible')

            for user in candidates:
                name = user.first_name or user.username

                if send:
                    # ── 1. In-app notification ──────────────────────────────
                    # Only create one per user per day per tier
                    already_notified = Notification.objects.filter(
                        recipient=user,
                        notif_type=Notification.NotifType.STUDY_REMINDER,
                        created_at__date=now.date(),
                    ).exists()

                    if not already_notified:
                        Notification.objects.create(
                            recipient=user,
                            notif_type=Notification.NotifType.STUDY_REMINDER,
                            title=tier['push_title'].format(name=name, days=days),
                            message=tier['push_body'].format(name=name, days=days),
                        )

                    # ── 2. Web Push (PWA) ────────────────────────────────────
                    push_sent = push_to_user(
                        user,
                        title=tier['push_title'].format(name=name, days=days),
                        body=tier['push_body'].format(name=name, days=days),
                        url='/',
                        tag=f'study-reminder-{days}d',
                    )
                    if push_sent:
                        logger.info('Push reminder sent to user %s (%d-day tier)', user.id, days)

                    # ── 3. Email ─────────────────────────────────────────────
                    if user.email:
                        subject = tier['subject'].format(name=name, days=days)
                        body = tier['body'].format(name=name, days=days, url=app_url)
                        try:
                            send_mail(
                                subject=subject,
                                message=body,
                                from_email=from_email,
                                recipient_list=[user.email],
                                fail_silently=False,
                            )
                            total_sent += 1
                            logger.info('Study reminder email sent to user %s (%s)', user.id, user.email)
                        except Exception as exc:
                            logger.error('Failed to send reminder to %s: %s', user.email, exc)
                else:
                    self.stdout.write(
                        f'  [DRY] Would notify {user.username} ({user.email or "no email"}) — {days}d tier'
                    )

        if send:
            self.stdout.write(self.style.SUCCESS(f'\nDone. {total_sent} email reminders sent.'))
        else:
            self.stdout.write(
                self.style.NOTICE('\nDry run complete. Run with --send to deliver notifications.')
            )
