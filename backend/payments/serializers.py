from rest_framework import serializers
from .models import PaymentMethod, Payment, Subscription


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ['id', 'name', 'display_name', 'is_active']


class PaymentSerializer(serializers.ModelSerializer):
    method = PaymentMethodSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'user',
            'amount',
            'currency',
            'status',
            'method',
            'transaction_id',
            'reference_code',
            'metadata',
            'phone_number',
            'created_at',
            'processed_at',
        ]
        read_only_fields = fields


class SubscriptionSerializer(serializers.ModelSerializer):
    payment_method = PaymentMethodSerializer(read_only=True)
    last_payment = PaymentSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'user',
            'tier',
            'status',
            'started_at',
            'expires_at',
            'auto_renew',
            'payment_method',
            'last_payment',
            'price',
            'currency',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'user',
            'status',
            'started_at',
            'expires_at',
            'payment_method',
            'last_payment',
            'price',
            'currency',
            'created_at',
            'updated_at',
        ]

