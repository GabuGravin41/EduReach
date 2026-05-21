from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    tier = serializers.SerializerMethodField()
    trial_days_remaining = serializers.SerializerMethodField()

    def get_tier(self, obj):
        if obj.is_superuser:
            return 'admin'
        return obj.tier

    def get_trial_days_remaining(self, obj):
        return obj.trial_days_remaining

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tier', 'bio', 'avatar', 'profile_cover', 'xp_points', 'level',
            'total_time_spent_seconds', 'show_xp_publicly',
            'learning_goal', 'learner_type', 'interests',
            'onboarding_completed', 'track', 'degree_course', 'year_of_study', 'phone_number', 'country',
            'institution', 'institution_role',
            'is_trial_active', 'trial_ends_at', 'trial_days_remaining',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'xp_points', 'level', 'is_trial_active', 'trial_ends_at', 'created_at', 'updated_at']


class ChallengeableUserSerializer(serializers.ModelSerializer):
    """Minimal user info for challenge-a-friend list (no email, no private data)."""
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'display_name', 'avatar']

    def get_display_name(self, obj):
        if obj.first_name or obj.last_name:
            return f'{obj.first_name or ""} {obj.last_name or ""}'.strip()
        return obj.username or f'User {obj.id}'


class UserProfileSerializer(serializers.ModelSerializer):
    """Detailed serializer for user profile."""
    profile_cover = serializers.ImageField(required=False, allow_null=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    tier = serializers.SerializerMethodField()
    trial_days_remaining = serializers.SerializerMethodField()

    def get_tier(self, obj):
        if obj.is_superuser:
            return 'admin'
        return obj.tier

    def get_trial_days_remaining(self, obj):
        return obj.trial_days_remaining

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tier', 'bio', 'avatar', 'profile_cover', 'xp_points', 'level',
            'total_time_spent_seconds', 'show_xp_publicly',
            'learning_goal', 'learner_type', 'interests',
            'onboarding_completed', 'track', 'degree_course', 'year_of_study', 'phone_number', 'country',
            'institution', 'institution_role',
            'is_trial_active', 'trial_ends_at', 'trial_days_remaining',
            'date_joined', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'username', 'xp_points', 'level',
            'is_trial_active', 'trial_ends_at',
            'date_joined', 'created_at', 'updated_at'
        ]

    def update(self, instance, validated_data):
        # Allow clearing optional image fields when null is sent
        if 'profile_cover' in self.initial_data and self.initial_data.get('profile_cover') is None:
            instance.profile_cover = None
            validated_data.pop('profile_cover', None)
        if 'avatar' in self.initial_data and self.initial_data.get('avatar') is None:
            instance.avatar = None
            validated_data.pop('avatar', None)
        return super().update(instance, validated_data)
