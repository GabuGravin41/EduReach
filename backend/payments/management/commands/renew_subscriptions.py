import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from payments.models import Subscription, Payment, PaymentMethod
from payments.services import MPesaService


class Command(BaseCommand):
    help = "Auto-renews subscriptions that are due to expire (run daily)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=1,
            help='Renew subscriptions expiring within this many days (default: 1)',
        )

    def handle(self, *args, **options):
        days = options['days']
        now = timezone.now()
        deadline = now + timedelta(days=days)
        candidates = Subscription.objects.filter(
            auto_renew=True,
            expires_at__lte=deadline,
        ).select_related('user', 'payment_method', 'last_payment')

        if not candidates.exists():
            self.stdout.write('No subscriptions eligible for auto-renewal.')
            return

        mpesa_service = None
        try:
            mpesa_service = MPesaService()
        except Exception:
            self.stderr.write('MPesa service not configured. Auto-renewals for MPesa will remain pending.')

        for subscription in candidates:
            if not subscription.payment_method:
                self.stderr.write(f'Subscription {subscription.id} has no payment method; skipping.')
                continue

            payment = Payment.objects.create(
                user=subscription.user,
                amount=subscription.price,
                currency=subscription.currency,
                status=Payment.Status.PENDING,
                method=subscription.payment_method,
                transaction_id=str(uuid.uuid4()),
                phone_number=getattr(subscription.last_payment, 'phone_number', ''),
                metadata={'auto_renew': True},
            )

            try:
                with transaction.atomic():
                    if subscription.payment_method.name == PaymentMethod.Method.MPESA and mpesa_service:
                        if payment.phone_number:
                            mpesa_service.initiate_stk_push(
                                phone_number=payment.phone_number,
                                amount=float(subscription.price),
                                account_reference=f'EDU{subscription.user_id}',
                                transaction_desc='EduReach Auto-Renew',
                            )
                        else:
                            self.stderr.write(f'No phone number on record for subscription {subscription.id}')
                    else:
                        payment.mark_completed({'auto_renew': True})

                    subscription.expires_at = subscription.expires_at + timedelta(days=30)
                    subscription.status = Subscription.Status.ACTIVE
                    subscription.last_payment = payment
                    subscription.save(update_fields=['expires_at', 'status', 'last_payment', 'updated_at'])

                    self.stdout.write(f'Renewed subscription {subscription.id} for user {subscription.user}')
            except Exception as exc:
                payment.mark_failed({'auto_renew': True, 'error': str(exc)})
                self.stderr.write(f'Failed to renew subscription {subscription.id}: {exc}')

