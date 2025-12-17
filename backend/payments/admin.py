from django.contrib import admin
from .models import PaymentMethod, Payment, Subscription


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'name', 'is_active', 'created_at')
    list_filter = ('is_active', 'name')
    search_fields = ('display_name', 'name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'currency', 'status', 'method', 'transaction_id', 'created_at')
    list_filter = ('status', 'method__name', 'currency')
    search_fields = ('user__username', 'transaction_id', 'reference_code')
    readonly_fields = ('created_at', 'updated_at', 'processed_at', 'metadata')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'tier', 'status', 'auto_renew', 'expires_at')
    list_filter = ('status', 'tier', 'auto_renew')
    search_fields = ('user__username',)
    readonly_fields = ('created_at', 'updated_at')
