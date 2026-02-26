from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tier', 'bio', 'avatar', 'xp_points', 'level', 
            'total_time_spent_seconds', 'show_xp_publicly',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'xp_points', 'level', 'created_at', 'updated_at']


class UserProfileSerializer(serializers.ModelSerializer):
    """Detailed serializer for user profile."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'tier', 'bio', 'avatar', 'xp_points', 'level',
            'total_time_spent_seconds', 'show_xp_publicly',
            'date_joined', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'username', 'xp_points', 'level', 
            'date_joined', 'created_at', 'updated_at'
        ]
