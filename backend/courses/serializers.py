from rest_framework import serializers
from .models import (
    Course,
    Lesson,
    UserProgress,
    CoursePricing,
    ContentPurchase,
    CreatorTip,
)
from users.serializers import UserSerializer


class LessonSerializer(serializers.ModelSerializer):
    """Serializer for Lesson model."""
    has_transcript = serializers.SerializerMethodField()
    videoId = serializers.SerializerMethodField()
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'title', 'video_id', 'videoId', 'video_url', 'duration',
            'order', 'description', 'transcript', 'transcript_language',
            'manual_transcript', 'transcript_fetched_at', 'has_transcript',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'transcript_fetched_at']
    
    def get_has_transcript(self, obj):
        """Check if lesson has any transcript available."""
        return bool(obj.transcript or obj.manual_transcript)

    def get_videoId(self, obj):
        return obj.video_id


class CoursePricingSerializer(serializers.ModelSerializer):
    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value

    def validate_free_preview_lessons(self, value):
        if value < 0:
            raise serializers.ValidationError("Free preview lessons cannot be negative.")
        return value

    class Meta:
        model = CoursePricing
        fields = [
            'is_paid',
            'price',
            'currency',
            'free_preview_lessons',
            'allow_tips',
        ]


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model."""
    owner = UserSerializer(read_only=True)
    lessons = LessonSerializer(many=True, read_only=True)
    lesson_count = serializers.SerializerMethodField()
    pricing = CoursePricingSerializer(read_only=True)
    progress = serializers.SerializerMethodField()
    completed_lesson_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'owner', 'thumbnail',
            'is_public', 'lessons', 'lesson_count', 'pricing', 'progress',
            'completed_lesson_ids',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_lesson_count(self, obj):
        return obj.lessons.count()

    def _get_user_progress(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return None
        return UserProgress.objects.filter(user=request.user, course=obj).first()

    def get_progress(self, obj):
        progress = self._get_user_progress(obj)
        if progress:
            return progress.progress_percentage
        return 0

    def get_completed_lesson_ids(self, obj):
        progress = self._get_user_progress(obj)
        if not progress:
            return []
        return list(progress.completed_lessons.values_list('id', flat=True))

    def validate_title(self, value):
        return (value or '').strip()


class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for course lists - now includes lessons."""
    owner = UserSerializer(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    lesson_count = serializers.SerializerMethodField()
    lessons = LessonSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    completed_lesson_ids = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'owner', 'owner_username',
            'thumbnail', 'is_public', 'lesson_count', 'progress',
            'completed_lesson_ids', 'created_at', 'updated_at', 'lessons'
        ]

    def get_lesson_count(self, obj):
        return obj.lessons.count()

    def _get_user_progress(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return None
        return UserProgress.objects.filter(user=request.user, course=obj).first()

    def get_progress(self, obj):
        progress = self._get_user_progress(obj)
        if progress:
            return progress.progress_percentage
        return 0

    def get_completed_lesson_ids(self, obj):
        progress = self._get_user_progress(obj)
        if not progress:
            return []
        return list(progress.completed_lessons.values_list('id', flat=True))


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer for UserProgress model."""
    course_title = serializers.CharField(source='course.title', read_only=True)
    completed_lesson_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        source='completed_lessons',
        queryset=Lesson.objects.all()
    )
    
    class Meta:
        model = UserProgress
        fields = [
            'id', 'user', 'course', 'course_title',
            'completed_lesson_ids', 'progress_percentage',
            'last_accessed', 'started_at'
        ]
        read_only_fields = ['id', 'user', 'progress_percentage', 'last_accessed', 'started_at']


class ContentPurchaseSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = ContentPurchase
        fields = ['id', 'course', 'course_title', 'amount', 'currency', 'created_at']
        read_only_fields = ['id', 'course', 'course_title', 'amount', 'currency', 'created_at']


class CreatorTipSerializer(serializers.ModelSerializer):
    from_username = serializers.CharField(source='from_user.username', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = CreatorTip
        fields = [
            'id',
            'from_user',
            'from_username',
            'course',
            'course_title',
            'amount',
            'currency',
            'message',
            'created_at',
        ]
        read_only_fields = ['id', 'from_user', 'from_username', 'course_title', 'created_at']
