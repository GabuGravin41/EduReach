import uuid
from decimal import Decimal, InvalidOperation
from datetime import timedelta
import re
import logging

from django.utils import timezone
from django.db import transaction
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import PaymentMethod, Payment, Subscription
from .serializers import (
    PaymentMethodSerializer,
    PaymentSerializer,
    SubscriptionSerializer,
)
from .services import MPesaService, CardPaymentService, BankTransferService

logger = logging.getLogger(__name__)


class PaymentMethodListView(generics.ListAPIView):
    """
    Returns a list of active payment methods.
    Public endpoint so pricing page can fetch available options.
    """

    queryset = PaymentMethod.objects.filter(is_active=True)
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.AllowAny]


class PaymentHistoryListView(generics.ListAPIView):
    """
    Returns payment history for the authenticated user.
    """

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')


class PaymentInitiateView(APIView):
    """
    Creates a pending payment record before redirecting to provider.
    Real integrations (M-Pesa STK Push, card redirects, bank references)
    will build on top of this endpoint.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        method_id = request.data.get('payment_method_id')
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'KES')
        reference_code = request.data.get('reference_code', '')

        if not method_id or not amount:
            return Response(
                {'detail': 'payment_method_id and amount are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            method = PaymentMethod.objects.get(id=method_id, is_active=True)
        except PaymentMethod.DoesNotExist:
            return Response({'detail': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_value = Decimal(str(amount))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Amount must be a number'}, status=status.HTTP_400_BAD_REQUEST)

        if amount_value <= 0:
            return Response({'detail': 'Amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

        # Reasonable guardrails to avoid accidental huge charges from bad clients
        if amount_value > Decimal('200000'):
            return Response({'detail': 'Amount exceeds maximum allowed'}, status=status.HTTP_400_BAD_REQUEST)

        currency = str(currency or '').upper().strip()
        if not re.match(r'^[A-Z]{3}$', currency):
            return Response({'detail': 'Currency must be a valid 3-letter code (e.g. KES)'}, status=status.HTTP_400_BAD_REQUEST)

        payment_status = Payment.Status.PENDING

        metadata = request.data.get('metadata', {}) or {}
        if not isinstance(metadata, dict):
            return Response({'detail': 'metadata must be an object'}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.create(
            user=user,
            amount=amount_value,
            currency=currency,
            status=payment_status,
            method=method,
            transaction_id=str(uuid.uuid4()),
            reference_code=reference_code or str(uuid.uuid4()),
            metadata=metadata,
            processed_at=timezone.now() if payment_status != Payment.Status.PENDING else None,
            phone_number=request.data.get('phone_number', ''),
        )

        message = 'Payment created.'

        if method.name == PaymentMethod.Method.MPESA:
            phone_number = request.data.get('phone_number')
            if not phone_number:
                payment.mark_failed({'error': 'Missing phone number'})
                return Response({'detail': 'phone_number is required for M-Pesa payments'}, status=status.HTTP_400_BAD_REQUEST)
            normalized_phone = str(phone_number).strip()
            # Kenya MSISDN in E.164-like format without plus (e.g. 2547XXXXXXXX)
            if not re.match(r'^2547\d{8}$', normalized_phone):
                payment.mark_failed({'error': 'Invalid phone number format'})
                return Response({'detail': 'phone_number must be in format 2547XXXXXXXX'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                mpesa_service = MPesaService()
                response_payload = mpesa_service.initiate_stk_push(
                    phone_number=normalized_phone,
                    amount=float(amount_value),
                    account_reference=f'EDU{user.id}',
                    transaction_desc='EduReach Subscription',
                )
                payment.reference_code = response_payload.get('CheckoutRequestID', payment.reference_code)
                payment.metadata.update(response_payload)
                payment.save(update_fields=['reference_code', 'metadata', 'updated_at'])
                message = 'STK Push initiated. Approve the request on your phone.'
            except Exception as exc:
                payment.mark_failed({'error': str(exc)})
                return Response({'detail': f'MPesa error: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        elif method.name == PaymentMethod.Method.CARD:
            token = request.data.get('card_token')
            if not token:
                payment.mark_failed({'error': 'Missing card token'})
                return Response({'detail': 'card_token is required for card payments'}, status=status.HTTP_400_BAD_REQUEST)
            card_service = CardPaymentService()
            response_payload = card_service.process_card_payment(
                amount=float(amount_value),
                currency=payment.currency,
                token=token,
                description='EduReach subscription',
            )
            payment.metadata.update(response_payload)
            payment.reference_code = response_payload.get('transaction_id', payment.reference_code)
            if response_payload.get('status') == 'completed':
                payment.mark_completed(response_payload)
            else:
                payment.mark_failed(response_payload)
            message = response_payload.get('message', 'Card payment processed.')

        elif method.name == PaymentMethod.Method.BANK_TRANSFER:
            bank_service = BankTransferService()
            response_payload = bank_service.create_bank_reference(
                user_identifier=str(user.id),
                amount=float(amount_value),
                currency=payment.currency,
            )
            payment.metadata.update(response_payload)
            payment.reference_code = response_payload.get('reference_code', payment.reference_code)
            payment.save(update_fields=['metadata', 'reference_code', 'updated_at'])
            message = response_payload.get('message', 'Use the reference code when sending your bank transfer.')

        serializer = PaymentSerializer(payment)
        return Response({'payment': serializer.data, 'message': message}, status=status.HTTP_201_CREATED)


class MPesaCallbackView(APIView):
    """
    Handles Safaricom STK callback payloads.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        callback = request.data.get('Body', {}).get('stkCallback', {})
        checkout_request_id = callback.get('CheckoutRequestID')
        result_code = callback.get('ResultCode')
        result_desc = callback.get('ResultDesc', '')

        if not checkout_request_id:
            return Response({'detail': 'Invalid callback payload'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(reference_code=checkout_request_id)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        metadata = payment.metadata or {}
        metadata['mpesa_callback'] = callback

        if result_code == 0:
            payment.mark_completed(metadata)
        else:
            payment.mark_failed({'error': result_desc, 'mpesa_callback': callback})

        return Response({'ResultCode': 0, 'ResultDesc': 'Processed'})


class SubscriptionDetailView(APIView):
    """
    Returns the authenticated user's subscription details.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = Subscription.objects.filter(user=request.user).first()
        if not subscription:
            # Return 200 for free users to avoid noisy 404s in client apps.
            return Response({'detail': 'No active subscription', 'tier': 'free', 'status': 'inactive'})
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)


class SubscriptionUpgradeView(APIView):
    """
    Upgrades or creates a subscription using a completed payment.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        tier = request.data.get('tier')
        payment_id = request.data.get('payment_id')
        duration_days = int(request.data.get('duration_days', 30))

        if not tier or not payment_id:
            return Response({'detail': 'tier and payment_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(id=payment_id, user=user)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.COMPLETED:
            return Response({'detail': 'Payment must be completed to activate subscription'}, status=status.HTTP_400_BAD_REQUEST)

        expires_at = timezone.now() + timedelta(days=duration_days)

        with transaction.atomic():
            subscription, _ = Subscription.objects.get_or_create(
                user=user,
                defaults={
                    'tier': tier,
                    'status': Subscription.Status.ACTIVE,
                    'started_at': timezone.now(),
                    'expires_at': expires_at,
                    'payment_method': payment.method,
                    'last_payment': payment,
                    'price': payment.amount,
                    'currency': payment.currency,
                }
            )

            if not _:
                subscription.tier = tier
                subscription.status = Subscription.Status.ACTIVE
                subscription.started_at = timezone.now()
                subscription.expires_at = expires_at
                subscription.payment_method = payment.method
                subscription.last_payment = payment
                subscription.auto_renew = True
                subscription.price = payment.amount
                subscription.currency = payment.currency
                subscription.save(update_fields=[
                    'tier',
                    'status',
                    'started_at',
                    'expires_at',
                    'payment_method',
                    'last_payment',
                    'auto_renew',
                    'price',
                    'currency',
                    'updated_at',
                ])

            # Update user tier to match subscription
            if hasattr(user, 'tier'):
                user.tier = tier
                user.save(update_fields=['tier'])

        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionCancelView(APIView):
    """
    Cancels auto-renewal for the current subscription.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subscription = Subscription.objects.filter(user=request.user).first()
        if not subscription:
            return Response({'detail': 'No active subscription'}, status=status.HTTP_404_NOT_FOUND)
        subscription.cancel()
        return Response({'detail': 'Subscription will remain active until the current period ends.'})


class EnterpriseInquiryView(APIView):
    """
    Accepts enterprise/institution inquiries and forwards them to sales email.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        name = str(request.data.get('name', '') or '').strip()
        email = str(request.data.get('email', '') or '').strip()
        message = str(request.data.get('message', '') or '').strip()

        if not name or not email or not message:
            return Response(
                {'detail': 'name, email, and message are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) < 10:
            return Response(
                {'detail': 'Please provide more details in your inquiry.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        recipient = getattr(settings, 'ENTERPRISE_INQUIRY_EMAIL', None) or 'hello@edureach.app'
        subject = f'Enterprise inquiry from {name}'
        body = (
            f'Name: {name}\n'
            f'Email: {email}\n'
            f'User ID: {getattr(user, "id", "N/A")}\n'
            f'Username: {getattr(user, "username", "")}\n'
            f'Current tier: {getattr(user, "tier", "unknown")}\n\n'
            f'Message:\n{message}\n'
        )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edureach.app'),
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception as exc:
            logger.error('Failed to send enterprise inquiry email: %s', exc, exc_info=True)
            return Response(
                {'detail': 'Could not send inquiry right now. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'detail': 'Inquiry sent successfully.'}, status=status.HTTP_200_OK)

# Create your views here.
