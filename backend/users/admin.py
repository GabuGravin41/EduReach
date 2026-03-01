from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for custom User model. Superusers can promote/demote staff and superuser here."""
    list_display = ['username', 'email', 'tier', 'is_staff', 'is_superuser', 'is_active', 'date_joined']
    list_editable = ['tier', 'is_staff', 'is_superuser', 'is_active']
    list_filter = ['tier', 'is_staff', 'is_superuser', 'is_active']
    search_fields = ['username', 'email']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Subscription', {'fields': ('tier', 'bio', 'avatar')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Subscription', {'fields': ('tier',)}),
    )
