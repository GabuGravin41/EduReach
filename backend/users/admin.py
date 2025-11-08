from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for custom User model."""
    list_display = ['username', 'email', 'tier', 'is_staff', 'date_joined']
    list_filter = ['tier', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Subscription', {'fields': ('tier', 'bio', 'avatar')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Subscription', {'fields': ('tier',)}),
    )
