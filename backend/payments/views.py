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


def _send_payment_confirmation_email(user, tier_label: str):
    """Send a payment confirmation email. Fails silently."""
    if not user.email:
        return
    try:
        app_url = getattr(settings, 'FRONTEND_URL', 'https://edureach.app')
        name = user.first_name or user.username
        send_mail(
            subject=f'✅ Payment confirmed — welcome to EduReach {tier_label}!',
            message=(
                f'Hi {name},\n\n'
                f'Your payment was successful and your account has been upgraded to EduReach {tier_label}.\n\n'
                'You now have access to all premium features. Log in to get started:\n'
                f'{app_url}\n\n'
                'If you have any questions about your subscription, reply to this email.\n\n'
                '— The EduReach Team'
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edureach.app'),
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass
from .serializers import (
    PaymentMethodSerializer,
    PaymentSerializer,
    SubscriptionSerializer,
)
from .services import MPesaService, CardPaymentService, BankTransferService
from .paystack_service import PaystackService

logger = logging.getLogger(__name__)


class PaymentMethodListView(generics.ListAPIView):
    """
    Returns a list of active payment methods.
    Public endpoint so pricing page can fetch available options.
    Unpaginated so the response is always a plain list for the billing UI.
    """

    queryset = PaymentMethod.objects.filter(is_active=True).order_by('id')
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


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

        if method.name == PaymentMethod.Method.MPESA_PAYBILL:
            # Account number for user to enter in M-Pesa Paybill flow (Paybill → Account → Amount).
            account = f"EDU{user.id}_{payment.id}"
            payment.reference_code = account
            payment.save(update_fields=['reference_code'])
            config = method.config or {}
            paybill_number = config.get('paybill_number', '123456')
            message = (
                f'Paybill: {paybill_number}, Account: {account}, Amount: {amount_value} {currency}. '
                'After paying, enter your M-Pesa transaction code in the app.'
            )
            serializer = PaymentSerializer(payment)
            return Response({
                'payment': serializer.data,
                'message': message,
                'paybill_number': paybill_number,
                'account': account,
                'amount': str(amount_value),
                'currency': currency,
            }, status=status.HTTP_201_CREATED)

        if method.name == PaymentMethod.Method.MPESA:
            phone_number = request.data.get('phone_number')
            if not phone_number:
                payment.mark_failed({'error': 'Missing phone number'})
                return Response({'detail': 'phone_number is required for M-Pesa payments'}, status=status.HTTP_400_BAD_REQUEST)
            normalized_phone = str(phone_number).strip()
            # Accept 254XXXXXXXXX (both 2547xx and 2541xx Safaricom/Airtel)
            if not re.match(r'^254[71]\d{8}$', normalized_phone):
                payment.mark_failed({'error': 'Invalid phone number format'})
                return Response({'detail': 'Enter a valid Kenyan number starting with 254 (e.g. 254712345678 or 254112345678)'}, status=status.HTTP_400_BAD_REQUEST)
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
                logger.error('MPesa STK push failed: %s', exc)
                payment.mark_failed({'error': str(exc)})
                error_str = str(exc).lower()
                if '404' in error_str or 'not found' in error_str:
                    friendly = 'M-Pesa is temporarily unavailable. Please try again in a few minutes or use Paybill instead.'
                elif '401' in error_str or 'unauthorized' in error_str or 'access token' in error_str.lower():
                    friendly = 'M-Pesa authentication failed. Please contact support.'
                elif 'timeout' in error_str or 'connection' in error_str:
                    friendly = 'Could not reach M-Pesa. Check your internet connection and try again.'
                else:
                    friendly = 'M-Pesa payment could not be initiated. Please try again or use a different payment method.'
                return Response({'detail': friendly}, status=status.HTTP_502_BAD_GATEWAY)

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

        elif method.name == PaymentMethod.Method.PAYPAL:
            payment.reference_code = f'PAYPAL-{user.id}-{payment.id}'
            payment.save(update_fields=['reference_code'])
            config = method.config or {}
            instructions = config.get(
                'instructions',
                'We will email you a PayPal payment link, or pay to the address in your confirmation email. '
                'Quote your reference when paying. Your subscription will be activated once we confirm receipt.'
            )
            payment.metadata['paypal_instructions'] = instructions
            payment.save(update_fields=['metadata', 'updated_at'])
            message = f'Reference: {payment.reference_code}. {instructions}'

        elif method.name == PaymentMethod.Method.PAYSTACK:
            try:
                paystack = PaystackService()
                # Convert amount to smallest unit (multiply by 100)
                amount_kobo = int(amount_value * 100)
                # Use a short unique reference
                ref = f'EDU-{user.id}-{payment.id}'
                payment.reference_code = ref
                payment.save(update_fields=['reference_code'])

                # Map currency for Paystack (NGN is default, USD supported)
                paystack_currency = currency if currency in ('NGN', 'USD', 'GHS', 'ZAR') else 'NGN'

                tx_data = paystack.initialize_transaction(
                    email=user.email,
                    amount_kobo=amount_kobo,
                    reference=ref,
                    currency=paystack_currency,
                )
                payment.metadata.update({'paystack_access_code': tx_data.get('access_code'), 'paystack_authorization_url': tx_data.get('authorization_url')})
                payment.save(update_fields=['metadata', 'updated_at'])
                message = f'Complete your payment using Paystack. Reference: {ref}. Use the payment link or enter your reference when asked.'
            except Exception as exc:
                logger.error('Paystack init failed: %s', exc)
                payment.mark_failed({'error': str(exc)})
                return Response({'detail': 'Card payment could not be initiated. Please try again or use a different payment method.'}, status=status.HTTP_502_BAD_GATEWAY)

        serializer = PaymentSerializer(payment)
        response_data = {'payment': serializer.data, 'message': message}
        if method.name == PaymentMethod.Method.PAYSTACK and payment.metadata.get('paystack_authorization_url'):
            response_data['paystack_url'] = payment.metadata['paystack_authorization_url']
            response_data['reference'] = payment.reference_code
        return Response(response_data, status=status.HTTP_201_CREATED)


class ConfirmPaybillView(APIView):
    """
    User submits M-Pesa transaction code after paying via Paybill.
    Payment stays pending until admin verifies and marks completed in Django Admin.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, payment_id):
        transaction_code = (request.data.get('transaction_code') or '').strip()
        if not transaction_code:
            return Response(
                {'detail': 'transaction_code is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
        if payment.method.name != PaymentMethod.Method.MPESA_PAYBILL:
            return Response({'detail': 'This payment is not M-Pesa Paybill'}, status=status.HTTP_400_BAD_REQUEST)
        if payment.status != Payment.Status.PENDING:
            return Response({'detail': 'Payment is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        payment.metadata['mpesa_transaction_code'] = transaction_code
        payment.save(update_fields=['metadata', 'updated_at'])
        return Response({
            'detail': 'Transaction code recorded. Your subscription will be activated once we confirm the payment.',
            'payment': PaymentSerializer(payment).data,
        }, status=status.HTTP_200_OK)


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
            logger.warning('MPesa callback: payment not found for CheckoutRequestID %s', checkout_request_id)
            return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

        metadata = payment.metadata or {}
        metadata['mpesa_callback'] = callback

        if result_code == 0:
            payment.mark_completed(metadata)
        else:
            payment.mark_failed({'error': result_desc, 'mpesa_callback': callback})

        return Response({'ResultCode': 0, 'ResultDesc': 'Processed'})


class MPesaQueryView(APIView):
    """
    Frontend calls this when STK push is pending and wants to verify without
    waiting for the callback (e.g. ngrok expired, callback URL changed).

    POST /api/payments/mpesa/query/
    Body: { "payment_id": 42 }

    Queries Safaricom directly and marks the payment completed if paid.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get('payment_id')
        if not payment_id:
            return Response({'detail': 'payment_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.Status.COMPLETED:
            return Response({'status': 'completed', 'payment': PaymentSerializer(payment).data})

        # CheckoutRequestID from Safaricom looks like: ws_CO_XXXXXXXXXX
        # reference_code is set to this value after STK initiation
        checkout_id = payment.reference_code
        if not checkout_id or not checkout_id.startswith('ws_CO_'):
            # Fall back to metadata in case reference_code wasn't saved
            checkout_id = (payment.metadata or {}).get('CheckoutRequestID')
            if not checkout_id:
                return Response({'detail': 'No CheckoutRequestID found. The STK push may still be pending.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mpesa = MPesaService()
            result = mpesa.query_stk_push(checkout_id)
        except Exception as exc:
            logger.error('MPesa query failed: %s', exc)
            return Response({'detail': 'Could not verify payment status. Please wait a moment and try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        result_code = result.get('ResultCode')
        result_desc = result.get('ResultDesc', '')

        if result_code == 0:
            payment.mark_completed({'mpesa_query': result})
            return Response({
                'status': 'completed',
                'message': 'Payment confirmed! Click Activate Subscription to continue.',
                'payment': PaymentSerializer(payment).data,
            })
        elif result_code in (1032, 1037, 2001):
            # 1032 = cancelled by user, 1037 = timeout, 2001 = wrong PIN
            payment.mark_failed({'mpesa_query': result, 'result_desc': result_desc})
            return Response({'status': 'failed', 'message': result_desc or 'Payment was not completed.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Still pending / unknown
            return Response({'status': 'pending', 'message': 'Payment is still being processed. Please wait and try again.'})


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
            subscription, created = Subscription.objects.get_or_create(
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

            if not created:
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

            # In-app notification for successful payment / tier upgrade
            try:
                from users.models import Notification
                tier_labels = {'learner': 'Starter', 'pro': 'Pro', 'pro_plus': 'Pro Plus'}
                tier_label = tier_labels.get(tier, tier.title())
                Notification.objects.create(
                    recipient=user,
                    notif_type=Notification.NotifType.PAYMENT_SUCCESS,
                    title=f'🎉 Welcome to EduReach {tier_label}!',
                    message=(
                        f'Your payment was successful and your account has been upgraded to {tier_label}. '
                        'Enjoy all your new features!'
                    ),
                )
                # Payment confirmation email
                _send_payment_confirmation_email(user, tier_label)
            except Exception:
                pass

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


class StartTrialView(APIView):
    """
    Starts a 14-day free trial for the authenticated user.
    Rules:
      - One trial per user, ever.
      - Cannot start a trial if the user already has an active paid subscription.
      - Trial tier defaults to 'pro' unless a valid tier is supplied.
    POST /api/payments/subscription/start-trial/
    Body: { "tier": "learner" | "pro" }   (optional, defaults to "pro")
    """

    TRIAL_DAYS = 14
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        tier = request.data.get('tier', 'pro')
        valid_tiers = {'learner', 'pro', 'pro_plus'}  # pro_plus kept for legacy
        if tier not in valid_tiers:
            return Response(
                {'detail': f'tier must be one of: {", ".join(sorted(valid_tiers))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Subscription.objects.filter(user=user).first()
        if existing:
            if existing.is_trial and existing.status == Subscription.Status.ACTIVE:
                return Response(
                    {'detail': 'You already have an active free trial.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not existing.is_trial and existing.status == Subscription.Status.ACTIVE:
                return Response(
                    {'detail': 'You already have an active paid subscription.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Check if they've ever had a trial (even expired/cancelled)
            if Subscription.objects.filter(user=user, is_trial=True).exists():
                return Response(
                    {'detail': 'You have already used your free trial.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        now = timezone.now()
        trial_end = now + timedelta(days=self.TRIAL_DAYS)

        with transaction.atomic():
            subscription, created = Subscription.objects.get_or_create(
                user=user,
                defaults={
                    'tier': tier,
                    'status': Subscription.Status.ACTIVE,
                    'started_at': now,
                    'expires_at': trial_end,
                    'is_trial': True,
                    'trial_ends_at': trial_end,
                    'price': 0,
                    'currency': 'KES',
                    'auto_renew': False,
                },
            )
            if not created:
                # Edge case: row existed but trial check above passed; update it.
                subscription.tier = tier
                subscription.status = Subscription.Status.ACTIVE
                subscription.started_at = now
                subscription.expires_at = trial_end
                subscription.is_trial = True
                subscription.trial_ends_at = trial_end
                subscription.price = 0
                subscription.auto_renew = False
                subscription.save(update_fields=[
                    'tier', 'status', 'started_at', 'expires_at',
                    'is_trial', 'trial_ends_at', 'price', 'auto_renew', 'updated_at',
                ])

            # Update user tier
            if hasattr(user, 'tier'):
                user.tier = tier
                user.save(update_fields=['tier'])

            # In-app notification
            try:
                from users.models import Notification
                tier_labels = {'learner': 'Starter', 'pro': 'Pro', 'pro_plus': 'Pro Plus'}
                tier_label = tier_labels.get(tier, tier.title())
                Notification.objects.create(
                    recipient=user,
                    notif_type=Notification.NotifType.PAYMENT_SUCCESS,
                    title=f'🎉 Your 14-day free trial has started!',
                    message=(
                        f'Welcome to EduReach {tier_label}! Your free trial runs until '
                        f'{trial_end.strftime("%B %d, %Y")}. No payment needed yet.'
                    ),
                )
            except Exception:
                pass

        serializer = SubscriptionSerializer(subscription)
        return Response({
            'detail': f'Your 14-day free trial has started! Enjoy EduReach {tier.replace("_", " ").title()}.',
            'trial_ends_at': trial_end.isoformat(),
            'subscription': serializer.data,
        }, status=status.HTTP_201_CREATED)




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


class PaystackVerifyView(APIView):
    """
    User calls this after completing Paystack payment to verify and mark as complete.
    POST /api/payments/paystack/verify/
    Body: {"reference": "EDU-1-42"}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = (request.data.get('reference') or '').strip()
        if not reference:
            return Response({'detail': 'reference is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(reference_code=reference, user=request.user)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == Payment.Status.COMPLETED:
            return Response({'detail': 'Payment already verified', 'payment': PaymentSerializer(payment).data})

        try:
            paystack = PaystackService()
            tx = paystack.verify_transaction(reference)
        except Exception as exc:
            logger.error('Paystack verify failed: %s', exc)
            return Response({'detail': 'Payment verification failed. Please try again or contact support.'}, status=status.HTTP_502_BAD_GATEWAY)

        if tx.get('status') == 'success':
            payment.mark_completed({'paystack_verification': tx})
            return Response({
                'detail': 'Payment verified successfully! Click "Activate Subscription" to complete.',
                'payment': PaymentSerializer(payment).data,
            })
        else:
            payment.mark_failed({'paystack_verification': tx})
            return Response(
                {'detail': f'Payment was not successful: {tx.get("gateway_response", "Unknown error")}'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PaystackWebhookView(APIView):
    """
    Handles Paystack webhook events.
    POST /api/payments/paystack/webhook/
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import hmac
        import hashlib
        from django.conf import settings as django_settings

        secret = getattr(django_settings, 'PAYSTACK_SECRET_KEY', '')
        signature = request.headers.get('x-paystack-signature', '')
        body = request.body
        expected = hmac.new(secret.encode('utf-8'), body, hashlib.sha512).hexdigest()

        if signature != expected:
            return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        event = request.data.get('event')
        data = request.data.get('data', {})

        if event == 'charge.success':
            reference = data.get('reference', '')
            try:
                payment = Payment.objects.get(reference_code=reference)
                if payment.status != Payment.Status.COMPLETED:
                    payment.mark_completed({'paystack_webhook': data})
            except Payment.DoesNotExist:
                pass

        return Response({'status': 'ok'})

# Create your views here.
