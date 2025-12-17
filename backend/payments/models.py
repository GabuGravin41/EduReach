from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone


User = get_user_model()
tier_choices = getattr(getattr(User, 'Tier', None), 'choices', [])


class TimeStampedModel(models.Model):
    """
    Abstract base model providing created_at/updated_at fields.
    Keeps timestamps consistent across payment related models.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PaymentMethod(TimeStampedModel):
    """
    Payment methods supported by the platform.

    Examples:
      - mpesa: Safaricom Daraja API credentials
      - bank_transfer: local bank details for manual verification
      - card: Stripe/Paystack/Flutterwave credentials
    """

    class Method(models.TextChoices):
        MPESA = 'mpesa', 'M-Pesa'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        CARD = 'card', 'Card Payment'

    name = models.CharField(max_length=50, choices=Method.choices, unique=True)
    display_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.display_name


class Payment(TimeStampedModel):
    """
    Represents any monetary transaction on the platform.
    Can be subscription renewals, creator tips, paid content unlocks, etc.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    transaction_id = models.CharField(max_length=100, unique=True)
    reference_code = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def mark_completed(self, metadata: dict | None = None):
        self.status = self.Status.COMPLETED
        self.processed_at = timezone.now()
        if metadata:
            self.metadata.update(metadata)
        self.save(update_fields=['status', 'processed_at', 'metadata', 'updated_at'])

    def mark_failed(self, metadata: dict | None = None):
        self.status = self.Status.FAILED
        self.processed_at = timezone.now()
        if metadata:
            self.metadata.update(metadata)
        self.save(update_fields=['status', 'processed_at', 'metadata', 'updated_at'])

    def __str__(self):
        return f"{self.user} - {self.amount} {self.currency} ({self.status})"


class Subscription(TimeStampedModel):
    """
    Tracks active subscriptions for each user.
    Handles tier, renewal dates, auto-renew preferences.
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        CANCELLED = 'cancelled', 'Cancelled'
        EXPIRED = 'expired', 'Expired'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    tier = models.CharField(max_length=15, choices=tier_choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    auto_renew = models.BooleanField(default=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='KES')
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions'
    )
    last_payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions'
    )

    class Meta:
        ordering = ['-expires_at']

    def cancel(self):
        """Cancel auto-renewal but keep subscription active until expires_at"""
        self.auto_renew = False
        self.status = self.Status.CANCELLED
        self.save(update_fields=['auto_renew', 'status', 'updated_at'])

    def mark_expired(self):
        self.status = self.Status.EXPIRED
        self.save(update_fields=['status', 'updated_at'])

    def __str__(self):
        return f"{self.user} - {self.tier} ({self.status})"
