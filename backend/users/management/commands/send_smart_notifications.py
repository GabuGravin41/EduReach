"""
Management command: send_smart_notifications
---------------------------------------------
Sends personalised, context-aware notifications to users based on their
actual learning activity — not generic blasts.

Notification types fired:

  1. continue_learning  — "You were studying X, here's what's next"
                          (users active in last 1–3 days, last session topic known)

  2. new_content        — "New [engineering/olympiad] papers added in your topics"
                          (assessments created in last 7 days that match user interests)

  3. achievement_near   — "You're 50 XP from the next level!"
                          (users within 10% of their next XP threshold)

  4. feature_announcement — broadcast a single message to all (or active) users
                            (triggered manually with --feature flag)

Usage:
    # Dry run — shows who would receive what:
    python manage.py send_smart_notifications

    # Actually send in-app + email notifications:
    python manage.py send_smart_notifications --send

    # Only specific types:
    python manage.py send_smart_notifications --send --types continue_learning,new_content

    # Broadcast a feature announcement (--send required):
    python manage.py send_smart_notifications --send \\
        --feature "New: Engineering Past Papers" \\
        --feature-body "592 KU engineering past paper questions are now live in Assessments!" \\
        --feature-url "/assessments"

    # Only notify active users (logged in last 30 days) for broadcasts:
    python manage.py send_smart_notifications --send --feature "..." --active-only

Schedule via cron:
    # Daily at 8 AM EAT (UTC+3 = 5 AM UTC):
    0 5 * * * /opt/edureach/venv/bin/python /opt/edureach/backend/manage.py send_smart_notifications --send
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

# XP level thresholds (must match frontend)
XP_LEVELS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]


def _level_for_xp(xp):
    level = 1
    for threshold in XP_LEVELS:
        if xp >= threshold:
            level += 1
    return level


def _xp_to_next_level(xp):
    for threshold in XP_LEVELS:
        if xp < threshold:
            return threshold - xp
    return None  # max level


def _send_notif_and_email(user, notif_type, title, message, url, from_email, app_url,
                           send, stdout, Notification, push_to_user, html_body=None):
    """Helper: create in-app notification, fire push, and send email."""
    name = user.first_name or user.username

    if not send:
        stdout.write(f'  [DRY] {user.username} ({user.email or "no email"}) — {title!r}')
        return

    # In-app notification (dedup per type per day)
    already = Notification.objects.filter(
        recipient=user,
        notif_type=notif_type,
        created_at__date=timezone.now().date(),
    ).exists()
    if not already:
        Notification.objects.create(
            recipient=user,
            notif_type=notif_type,
            title=title,
            message=message,
        )

    # Web Push
    push_to_user(user, title=title, body=message[:120], url=url, tag=f'smart-{notif_type}')

    # Email
    if user.email:
        plain = f'Hi {name},\n\n{message}\n\nVisit: {app_url}{url}\n\n— The EduReach Team\nhttps://edureach.site'
        html = html_body or _default_html(title, message, app_url + url, name)
        try:
            send_mail(
                subject=title,
                message=plain,
                from_email=from_email,
                recipient_list=[user.email],
                html_message=html,
                fail_silently=False,
            )
            logger.info('Smart notif email sent to %s (%s)', user.id, notif_type)
        except Exception as exc:
            logger.error('Email failed for %s: %s', user.email, exc)


def _default_html(title, body, cta_url, name):
    return f"""
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#f8fafc;">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">EduReach</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 12px;">{title}</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 24px;">Hi {name},</p>
    <p style="color:#475569;line-height:1.6;margin:0 0 24px;">{body}</p>
    <a href="{cta_url}"
       style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;
              border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Open EduReach →
    </a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      You're receiving this because you have an EduReach account.
      To unsubscribe from non-essential emails, reply with "unsubscribe".
    </p>
  </div>
</div>
"""


class Command(BaseCommand):
    help = 'Send smart, personalised notifications based on user learning activity.'

    def add_arguments(self, parser):
        parser.add_argument('--send', action='store_true', default=False,
                            help='Actually send (default: dry run).')
        parser.add_argument('--types', default='',
                            help='Comma-separated list of types to run. Default: all.')
        parser.add_argument('--feature', default='',
                            help='Title for a feature announcement broadcast.')
        parser.add_argument('--feature-body', default='',
                            help='Body text for the feature announcement.')
        parser.add_argument('--feature-url', default='/assessments',
                            help='Deep-link URL for the feature announcement.')
        parser.add_argument('--active-only', action='store_true', default=False,
                            help='For broadcasts, only target users active in last 30 days.')

    def handle(self, *args, **options):
        from users.models import Notification
        from users.push_notifications import push_to_user
        from assessments.models import Assessment, UserAttempt

        send = options['send']
        only_types = set(t.strip() for t in options['types'].split(',') if t.strip())
        feature_title = options['feature']
        feature_body = options['feature_body']
        feature_url = options['feature_url']
        active_only = options['active_only']

        app_url = getattr(settings, 'FRONTEND_URL', 'https://edureach.site')
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EduReach <edu.reach.co@gmail.com>')
        now = timezone.now()

        if not send:
            self.stdout.write(self.style.WARNING(
                'DRY RUN — pass --send to actually deliver notifications.\n'
            ))

        def _run(type_name):
            return not only_types or type_name in only_types

        totals = {}

        # ── 1. Continue Learning ───────────────────────────────────────────────
        if _run('continue_learning'):
            self.stdout.write(self.style.HTTP_INFO('\n[1/4] Continue Learning'))

            # Users active 1–3 days ago who have recent assessment attempts
            lower = now - timedelta(days=3)
            upper = now - timedelta(days=1)
            candidates = User.objects.filter(
                last_login__gte=lower,
                last_login__lt=upper,
                is_active=True,
            )

            count = 0
            for user in candidates:
                # Find the topic they were most recently studying
                last_attempt = UserAttempt.objects.filter(
                    user=user,
                ).select_related('assessment').order_by('-started_at').first()

                if last_attempt:
                    topic = last_attempt.assessment.topic or last_attempt.assessment.title
                    title = f'📖 Continue where you left off, {user.first_name or user.username}!'
                    message = (
                        f'You were studying {topic!r} on EduReach. '
                        'Pick up right where you left off — your progress is saved.'
                    )
                    url = f'/assessments/{last_attempt.assessment_id}'
                    html = _default_html(title, message, app_url + url, user.first_name or user.username)
                else:
                    # Generic continue — they've logged in but haven't done an assessment
                    title = f'👋 Ready to study, {user.first_name or user.username}?'
                    message = (
                        'You have hundreds of past papers and AI-powered quizzes waiting. '
                        'Start a session today and keep your streak going!'
                    )
                    url = '/assessments'
                    html = _default_html(title, message, app_url + url, user.first_name or user.username)

                _send_notif_and_email(
                    user, 'continue_learning', title, message, url,
                    from_email, app_url, send, self.stdout, Notification, push_to_user,
                    html_body=html,
                )
                count += 1

            totals['continue_learning'] = count
            self.stdout.write(f'  → {count} users targeted')

        # ── 2. New Content Available ──────────────────────────────────────────
        if _run('new_content'):
            self.stdout.write(self.style.HTTP_INFO('\n[2/4] New Content'))

            # Assessments created in the last 7 days
            recent_assessments = Assessment.objects.filter(
                created_at__gte=now - timedelta(days=7),
                is_public=True,
            ).order_by('-created_at')[:20]

            if not recent_assessments:
                self.stdout.write('  No new assessments in the last 7 days — skipping.')
            else:
                # Collect the subjects/topics covered by new content
                new_topics = set()
                new_tags = set()
                for a in recent_assessments:
                    if a.topic:
                        new_topics.add(a.topic.lower())
                    for tag in (a.tags or []):
                        new_tags.add(tag.lower())

                count = 0
                # Target users who have studied any of these topics before
                active_users = User.objects.filter(
                    is_active=True,
                    last_login__gte=now - timedelta(days=60),
                )
                for user in active_users:
                    # Check topic mastery overlap
                    user_topics = set(t.lower() for t in (user.topic_mastery or {}).keys())
                    overlap = user_topics & (new_topics | new_tags)

                    if overlap:
                        matched_topic = next(iter(overlap)).title()
                        count_new = recent_assessments.count()
                        title = f'📚 {count_new} new assessment{"s" if count_new != 1 else ""} added in {matched_topic}!'
                        message = (
                            f'New past papers and quizzes in {matched_topic} are now live on EduReach. '
                            'Test your knowledge and track your improvement!'
                        )
                    elif any(
                        tag in new_tags for tag in ['engineering', 'ku', 'kcse', 'olympiad']
                    ):
                        # Broad interest notification for engineering/KCSE content
                        title = '📚 New past papers are live on EduReach!'
                        message = (
                            'New KU engineering and past paper assessments are now available. '
                            'Hundreds of questions, complete with AI-generated model solutions.'
                        )
                    else:
                        continue

                    url = '/assessments'
                    _send_notif_and_email(
                        user, 'new_content', title, message, url,
                        from_email, app_url, send, self.stdout, Notification, push_to_user,
                    )
                    count += 1

                totals['new_content'] = count
                self.stdout.write(f'  → {count} users targeted')

        # ── 3. Achievement Near ───────────────────────────────────────────────
        if _run('achievement_near'):
            self.stdout.write(self.style.HTTP_INFO('\n[3/4] Achievement Near'))

            count = 0
            # Find users who are within 10% of the next XP level
            for user in User.objects.filter(is_active=True, xp_points__gt=0):
                xp_needed = _xp_to_next_level(user.xp_points or 0)
                if xp_needed is None:
                    continue  # max level
                current_level = _level_for_xp(user.xp_points or 0)
                # Next threshold
                next_threshold = (user.xp_points or 0) + xp_needed
                # Within 10% of next level
                if xp_needed <= next_threshold * 0.10:
                    title = f'⚡ You\'re almost Level {current_level + 1}, {user.first_name or user.username}!'
                    message = (
                        f'Just {xp_needed} XP to go to reach Level {current_level + 1}! '
                        'Complete one more quiz or assessment today to level up.'
                    )
                    url = '/assessments'
                    _send_notif_and_email(
                        user, 'achievement_near', title, message, url,
                        from_email, app_url, send, self.stdout, Notification, push_to_user,
                    )
                    count += 1

            totals['achievement_near'] = count
            self.stdout.write(f'  → {count} users targeted')

        # ── 4. Feature Announcement (manual broadcast) ────────────────────────
        if feature_title and _run('feature_announcement'):
            self.stdout.write(self.style.HTTP_INFO('\n[4/4] Feature Announcement Broadcast'))

            if not feature_body:
                self.stdout.write(self.style.ERROR(
                    '  --feature-body is required for a feature announcement. Skipping.'
                ))
            else:
                qs = User.objects.filter(is_active=True)
                if active_only:
                    qs = qs.filter(last_login__gte=now - timedelta(days=30))

                count = 0
                for user in qs:
                    _send_notif_and_email(
                        user, 'feature_announcement', feature_title, feature_body, feature_url,
                        from_email, app_url, send, self.stdout, Notification, push_to_user,
                    )
                    count += 1

                totals['feature_announcement'] = count
                self.stdout.write(f'  → {count} users targeted')

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write('')
        if send:
            self.stdout.write(self.style.SUCCESS(
                'Done. Notifications sent: ' + ', '.join(f'{k}={v}' for k, v in totals.items())
            ))
        else:
            self.stdout.write(self.style.NOTICE(
                'Dry run complete. Run with --send to deliver.'
            ))
