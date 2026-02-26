from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta


class User(AbstractUser):
    """Custom User model with subscription tiers."""
    
    class Tier(models.TextChoices):
        FREE = 'free', 'Free'
        LEARNER = 'learner', 'Learner'
        PRO = 'pro', 'Pro'
        PRO_PLUS = 'pro_plus', 'Pro Plus'
        ADMIN = 'admin', 'Admin'

    tier = models.CharField(
        max_length=10,
        choices=Tier.choices,
        default=Tier.FREE
    )
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
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
    
    def start_free_trial(self):
        """Start a 1-month free Pro trial for new users."""
        if not self.trial_started_at:  # Only if never had a trial before
            self.original_tier = self.tier
            self.tier = self.Tier.PRO
            self.trial_started_at = timezone.now()
            self.trial_ends_at = timezone.now() + timedelta(days=30)
            self.is_trial_active = True
            self.save()
            return True
        return False
    
    def check_trial_status(self):
        """Check if trial has expired and revert tier if needed."""
        if self.is_trial_active and self.trial_ends_at:
            if timezone.now() > self.trial_ends_at:
                self.tier = self.original_tier
                self.is_trial_active = False
                self.save()
                return False  # Trial expired
            return True  # Trial still active
        return False
    
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
            'free': {'assessments': 2, 'courses': 1, 'ai_queries': 0},
            'learner': {'assessments': 10, 'courses': 5, 'ai_queries': 50},
            'pro': {'assessments': 50, 'courses': float('inf'), 'ai_queries': 200},
            'pro_plus': {'assessments': float('inf'), 'courses': float('inf'), 'ai_queries': float('inf')},
            'admin': {'assessments': float('inf'), 'courses': float('inf'), 'ai_queries': float('inf')},
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
