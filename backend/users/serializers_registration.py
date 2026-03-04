from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers

from .models import User


class CustomRegisterSerializer(RegisterSerializer):
    """
    Extend dj-rest-auth registration to capture:
    - first_name, last_name
    - learning_goal (why they are here)
    - learner_type (who they are)
    - interests (broad learning interests)
    """

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    learning_goal = serializers.CharField(max_length=32, required=False, allow_blank=True)
    learner_type = serializers.CharField(max_length=32, required=False, allow_blank=True)
    interests = serializers.CharField(required=False, allow_blank=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data.update(
            {
                'first_name': self.validated_data.get('first_name', ''),
                'last_name': self.validated_data.get('last_name', ''),
            }
        )
        return data

    def save(self, request):
        user: User = super().save(request)
        # Persist onboarding preferences on the user profile
        user.learning_goal = self.validated_data.get('learning_goal', '') or ''
        user.learner_type = self.validated_data.get('learner_type', '') or ''
        user.interests = self.validated_data.get('interests', '') or ''
        user.save(update_fields=['first_name', 'last_name', 'learning_goal', 'learner_type', 'interests', 'updated_at'])
        return user

