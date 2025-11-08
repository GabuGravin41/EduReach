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

    class Meta:
        ordering = ['-created_at']


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
