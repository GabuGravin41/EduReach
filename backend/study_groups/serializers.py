from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import StudyGroup, StudyGroupPost, StudyGroupChallenge, ChallengeParticipation


User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = fields


class StudyGroupSerializer(serializers.ModelSerializer):
    creator = UserBasicSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_member = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = StudyGroup
        fields = [
            'id',
            'name',
            'description',
            'creator',
            'course',
            'course_title',
            'is_public',
            'max_members',
            'member_count',
            'is_member',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'member_count', 'is_member', 'created_at', 'updated_at']

    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.members.filter(id=request.user.id).exists()
        return False


class StudyGroupPostSerializer(serializers.ModelSerializer):
    author = UserBasicSerializer(read_only=True)

    class Meta:
        model = StudyGroupPost
        fields = ['id', 'group', 'author', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'group', 'author', 'created_at', 'updated_at']


class ChallengeParticipationSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = ChallengeParticipation
        fields = ['id', 'user', 'score', 'completed', 'last_updated']
        read_only_fields = ['id', 'user', 'last_updated']


class StudyGroupChallengeSerializer(serializers.ModelSerializer):
    group = StudyGroupSerializer(read_only=True)
    participations = ChallengeParticipationSerializer(many=True, read_only=True)
    assessment_title = serializers.CharField(source='assessment.title', read_only=True)

    class Meta:
        model = StudyGroupChallenge
        fields = [
            'id',
            'group',
            'title',
            'description',
            'assessment',
            'assessment_title',
            'start_date',
            'end_date',
            'participations',
            'created_at',
        ]
        read_only_fields = ['id', 'group', 'participations', 'created_at']

