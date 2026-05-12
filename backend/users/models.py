from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta


class Institution(models.Model):
    """Model representing a school or organization for bulk billing and management."""
    name = models.CharField(max_length=200)
    domain = models.CharField(max_length=100, blank=True, help_text="e.g. harvard.edu")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Custom User model with subscription tiers."""
    
    class Tier(models.TextChoices):
        FREE = 'free', 'Free'
        STARTER = 'learner', 'Starter'   # DB value stays 'learner' for backwards compat
        PRO = 'pro', 'Pro'
        PRO_PLUS = 'pro_plus', 'Pro Plus'  # kept for existing subscribers
        ADMIN = 'admin', 'Admin'

    tier = models.CharField(
        max_length=10,
        choices=Tier.choices,
        default=Tier.FREE
    )
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    profile_cover = models.ImageField(
        upload_to='profile_covers/',
        blank=True,
        null=True,
        help_text='Optional cover image for profile header. If not set, gradient is shown.',
    )
    
    # Gamification fields
    xp_points = models.BigIntegerField(default=0)
    total_time_spent_seconds = models.BigIntegerField(default=0)
    show_xp_publicly = models.BooleanField(default=True)
    level = models.PositiveIntegerField(default=1)
    
    # Free trial fields
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    is_trial_active = models.BooleanField(default=False)
    original_tier = models.CharField(
        max_length=10,
        choices=Tier.choices,
        default=Tier.FREE,
        help_text="Tier to revert to after trial ends"
    )
    # High-level onboarding preferences captured at signup/onboarding
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    
    class InstitutionRole(models.TextChoices):
        STUDENT = 'student', 'Student'
        TEACHER = 'teacher', 'Teacher'
        ADMIN = 'admin', 'Institution Admin'
        
    institution_role = models.CharField(
        max_length=20, 
        choices=InstitutionRole.choices, 
        default=InstitutionRole.STUDENT,
        blank=True
    )
    
    learning_goal = models.CharField(
        max_length=32,
        blank=True,
        help_text="Primary reason for using EduReach (e.g. olympiad, school, exams, curiosity).",
    )
    learner_type = models.CharField(
        max_length=32,
        blank=True,
        help_text="Self-described role (e.g. high_school_student, university_student, teacher, professional).",
    )
    interests = models.TextField(
        blank=True,
        help_text='Comma-separated list of interest tags (e.g. math, programming, languages, exams).',
    )

    # ── Personalisation / recommendation engine ──────────────────────────────
    topic_mastery = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            'Per-topic performance profile keyed by "Topic_difficulty". '
            'e.g. {"Geometry_comp_oe": {"attempts":5,"avg_score":0.42,"last_seen":"..."}}'
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username

    def get_current_usage(self):
        """Get current month's usage statistics."""
        usage, created = MonthlyUsage.objects.get_or_create(
            user=self,
            month=timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        )
        return usage
    
    TRIAL_DAYS = 14

    @property
    def trial_days_remaining(self):
        """Returns days left in trial, or None if no active trial."""
        if self.is_trial_active and self.trial_ends_at:
            delta = self.trial_ends_at - timezone.now()
            return max(0, delta.days)
        return None

    def start_free_trial(self):
        """Start a 14-day free Pro trial for new users."""
        if not self.trial_started_at:  # Only if never had a trial before
            self.original_tier = self.tier
            self.tier = self.Tier.PRO
            self.trial_started_at = timezone.now()
            self.trial_ends_at = timezone.now() + timedelta(days=self.TRIAL_DAYS)
            self.is_trial_active = True
            self.save()
            Notification.objects.create(
                recipient=self,
                notif_type=Notification.NotifType.TRIAL_STARTED,
                title='🎉 14 days of Pro — free!',
                message=(
                    f'Welcome to EduReach Pro! You have {self.TRIAL_DAYS} days to explore '
                    'all premium features at no cost. Upgrade before your trial ends to keep access.'
                ),
            )
            self._send_trial_email(
                subject=f'🎓 Your {self.TRIAL_DAYS}-day EduReach Pro trial has started!',
                body=(
                    'Hi {name},\n\n'
                    f'Your free {self.TRIAL_DAYS}-day Pro trial on EduReach has started!\n\n'
                    'With Pro you get:\n'
                    '  • Unlimited AI tutor conversations\n'
                    '  • Advanced assessments and proctoring\n'
                    '  • Priority access to all courses\n'
                    '  • Detailed analytics and leaderboards\n\n'
                    f'Your trial ends in {self.TRIAL_DAYS} days. Log in and explore:\n'
                    '{{url}}\n\n'
                    '— The EduReach Team'
                ),
            )
            return True
        return False

    def check_trial_status(self):
        """Check if trial has expired and revert tier if needed. Returns True if still active."""
        if self.is_trial_active and self.trial_ends_at:
            if timezone.now() > self.trial_ends_at:
                self.tier = self.original_tier or self.Tier.FREE
                self.is_trial_active = False
                self.save()
                # In-app notification
                Notification.objects.create(
                    recipient=self,
                    notif_type=Notification.NotifType.TRIAL_EXPIRED,
                    title='Your free trial has ended',
                    message='Your 14-day Pro trial is over. Upgrade now to keep all Pro features and continue your learning without limits.',
                )
                self._send_trial_email(
                    subject='Your EduReach Pro trial has ended',
                    body=(
                        'Hi {name},\n\n'
                        'Your 14-day EduReach Pro trial has ended.\n\n'
                        'To keep enjoying unlimited AI tutoring, advanced assessments, and premium courses, '
                        'upgrade to a paid plan:\n{{url}}/billing\n\n'
                        'Thank you for trying EduReach Pro!\n\n'
                        '— The EduReach Team'
                    ),
                )
                return False  # Trial expired
            return True  # Trial still active
        return False

    def _send_trial_email(self, subject: str, body: str):
        """Send a trial-related email to this user. Fails silently."""
        if not self.email:
            return
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            app_url = getattr(settings, 'FRONTEND_URL', 'https://edureach.app')
            name = self.first_name or self.username
            send_mail(
                subject=subject,
                message=body.format(name=name, url=app_url).replace('{{url}}', app_url),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edureach.app'),
                recipient_list=[self.email],
                fail_silently=True,
            )
        except Exception:
            pass
    
    def get_effective_tier(self):
        """Get the current effective tier (considering trial status)."""
        self.check_trial_status()  # Auto-check and update if expired
        return self.tier

    def award_xp(self, amount, transaction_type, category='bonus', description='', related_object_id=None):
        """Award XP to the user and log the transaction."""
        if amount <= 0:
            return 0
            
        XPTransaction.objects.create(
            user=self,
            amount=amount,
            transaction_type=transaction_type,
            category=category,
            description=description,
            related_object_id=related_object_id
        )
        
        # Atomic update of XP and level check
        self.xp_points = models.F('xp_points') + amount
        # Basic level calculation: level = floor(sqrt(xp / 100)) + 1
        # We can implement a more sophisticated curve later
        self.save(update_fields=['xp_points', 'updated_at'])
        self.refresh_from_db()
        
        # Simple level logic: 1000XP per level for now
        new_level = (self.xp_points // 1000) + 1
        if new_level > self.level:
            self.level = new_level
            self.save(update_fields=['level'])
            
        return amount

    class Meta:
        ordering = ['-created_at']


class XPTransaction(models.Model):
    """Logs all XP earned by a user."""
    
    class Category(models.TextChoices):
        ASSESSMENT = 'assessment', 'Assessment Completion'
        COURSE = 'course', 'Course/Lesson Progress'
        STREAK = 'streak', 'Daily Streak'
        BONUS = 'bonus', 'Achievement Bonus'
        CHALLENGE = 'challenge', 'Study Group Challenge'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xp_transactions')
    amount = models.PositiveIntegerField()
    transaction_type = models.CharField(max_length=50) # e.g., 'assessment_submit', 'lesson_complete'
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.BONUS
    )
    description = models.CharField(max_length=255, blank=True)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} earned {self.amount} XP ({self.category})"


class MonthlyUsage(models.Model):
    """Track monthly usage for tier limits."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monthly_usage')
    month = models.DateTimeField()  # First day of the month
    assessments_created = models.PositiveIntegerField(default=0)
    courses_created = models.PositiveIntegerField(default=0)
    ai_queries_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'month']
        ordering = ['-month']

    def __str__(self):
        return f"{self.user.username} - {self.month.strftime('%Y-%m')}"

    @property
    def resets_at(self):
        """When this usage period resets (next month)."""
        if self.month.month == 12:
            return self.month.replace(year=self.month.year + 1, month=1)
        else:
            return self.month.replace(month=self.month.month + 1)

    def get_tier_limits(self):
        """Get limits based on user's current tier."""
        tier_limits = {
            'free':     {'assessments': 3,            'courses': 2,            'ai_queries': 15},
            'learner':  {'assessments': 15,           'courses': 5,            'ai_queries': 100},
            'pro':      {'assessments': float('inf'), 'courses': float('inf'), 'ai_queries': 500},
            'pro_plus': {'assessments': float('inf'), 'courses': float('inf'), 'ai_queries': float('inf')},
            'admin':    {'assessments': float('inf'), 'courses': float('inf'), 'ai_queries': float('inf')},
        }
        return tier_limits.get(self.user.tier, tier_limits['free'])

    def can_create_assessment(self):
        """Check if user can create another assessment this month."""
        limits = self.get_tier_limits()
        return self.assessments_created < limits['assessments']

    def can_create_course(self):
        """Check if user can create another course this month."""
        limits = self.get_tier_limits()
        return self.courses_created < limits['courses']

    def can_use_ai(self):
        """Check if user can make another AI query this month."""
        limits = self.get_tier_limits()
        return self.ai_queries_used < limits['ai_queries']


class Notification(models.Model):
    """In-app notifications for users (challenges, system messages, etc.)."""

    class NotifType(models.TextChoices):
        CHALLENGE = 'challenge', 'Challenge'
        SYSTEM = 'system', 'System'
        TRIAL_STARTED = 'trial_started', 'Trial Started'
        TRIAL_EXPIRING = 'trial_expiring', 'Trial Expiring'
        TRIAL_EXPIRED = 'trial_expired', 'Trial Expired'
        PAYMENT_SUCCESS = 'payment_success', 'Payment Successful'
        PAYMENT_FAILED = 'payment_failed', 'Payment Failed'
        LEVEL_UP = 'level_up', 'Level Up'
        STUDY_REMINDER = 'study_reminder', 'Study Reminder'
        ASSESSMENT_GRADED = 'assessment_graded', 'Assessment Graded'
        MISSING_TRANSCRIPT = 'missing_transcript', 'Missing Transcript'
        FEATURE_ANNOUNCEMENT = 'feature_announcement', 'Feature Announcement'
        CONTINUE_LEARNING = 'continue_learning', 'Continue Learning'
        NEW_CONTENT = 'new_content', 'New Content Available'
        ACHIEVEMENT_NEAR = 'achievement_near', 'Achievement Near'

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )
    sender = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications'
    )
    notif_type = models.CharField(max_length=20, choices=NotifType.choices, default=NotifType.SYSTEM)
    title = models.CharField(max_length=255)
    message = models.TextField()
    # Optional deep-link data
    assessment_id = models.IntegerField(null=True, blank=True)
    share_token = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notif_type}] {self.recipient.username}: {self.title}"


class PushSubscription(models.Model):
    """
    Stores a Web Push subscription for one browser/device.

    Created when the user grants push-notification permission in the PWA.
    Each user may have multiple active subscriptions (one per device/browser).
    Stale subscriptions (410 response from push provider) are marked is_active=False.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    # The push service endpoint URL (unique per subscription)
    endpoint = models.TextField(unique=True)
    # VAPID P-256 DH public key (base64url-encoded)
    p256dh = models.TextField()
    # VAPID auth secret (base64url-encoded)
    auth = models.TextField()
    # UA info for debugging (e.g. "Chrome 124 / Android")
    user_agent = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PushSub({self.user.username}) — {'active' if self.is_active else 'inactive'}"


class SiteVisit(models.Model):
    """
    Tracks every visitor session — registered users, guests, and anonymous.
    Keyed by a session_id generated in the browser (localStorage UUID).
    One row per session; last_seen is updated on subsequent pings.
    """
    session_id = models.CharField(max_length=64, db_index=True, unique=True)
    user = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='site_visits'
    )
    is_guest = models.BooleanField(default=False)
    # Whether this session started as guest and the user later created an account
    converted = models.BooleanField(default=False)
    # Most recent page/view visited
    page = models.CharField(max_length=100, blank=True)
    referrer = models.CharField(max_length=500, blank=True)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_seen']
        indexes = [
            models.Index(fields=['first_seen']),
            models.Index(fields=['is_guest']),
            models.Index(fields=['converted']),
        ]

    def __str__(self):
        who = self.user.username if self.user_id else ('guest' if self.is_guest else 'anon')
        return f"SiteVisit({who}, {self.session_id[:8]}…)"
