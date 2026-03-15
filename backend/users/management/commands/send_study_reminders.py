"""
Management command: send_study_reminders
-----------------------------------------
Sends motivational study-reminder emails to users who haven't
logged in recently (Duolingo-style nudges).

Tiers of inactivity:
  - 3 days:  gentle nudge  ("We miss you!")
  - 7 days:  stronger push ("Your streak is at risk!")
  - 14 days: re-engagement ("Come back and pick up where you left off")

Users with email_reminders_enabled=False (if the field exists) are skipped.
Users with no email address are skipped.

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
    help = 'Send study reminder emails to users who have been inactive.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send',
            action='store_true',
            default=False,
            help='Actually send emails (default is dry-run).',
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

        if not send:
            self.stdout.write(
                self.style.WARNING('DRY RUN — no emails will be sent. Pass --send to actually send.')
            )

        total_sent = 0

        for tier in REMINDER_TIERS:
            days = tier['days']
            if only_days and days != only_days:
                continue

            # Users whose last login was between `days` and `days + 1` ago
            # (so we only send each tier once, not every day)
            lower = now - timedelta(days=days + 1)
            upper = now - timedelta(days=days)

            candidates = User.objects.filter(
                last_login__gte=lower,
                last_login__lt=upper,
                is_active=True,
            ).exclude(email='').exclude(email__isnull=True)

            # Skip users who have opted out (if field exists)
            if hasattr(User, 'email_reminders_enabled'):
                candidates = candidates.filter(email_reminders_enabled=True)

            count = candidates.count()
            self.stdout.write(
                f'Tier {days}d: {count} users eligible'
            )

            for user in candidates:
                name = user.first_name or user.username
                subject = tier['subject'].format(name=name, days=days)
                body = tier['body'].format(name=name, days=days, url=app_url)

                if send:
                    try:
                        send_mail(
                            subject=subject,
                            message=body,
                            from_email=from_email,
                            recipient_list=[user.email],
                            fail_silently=False,
                        )
                        total_sent += 1
                        logger.info('Study reminder sent to user %s (%s)', user.id, user.email)
                    except Exception as exc:
                        logger.error('Failed to send reminder to %s: %s', user.email, exc)
                else:
                    self.stdout.write(
                        f'  [DRY] Would email {user.email} ({days}d tier)'
                    )

        if send:
            self.stdout.write(self.style.SUCCESS(f'\nDone. {total_sent} reminders sent.'))
        else:
            self.stdout.write(
                self.style.NOTICE('\nDry run complete. Run with --send to deliver emails.')
            )
