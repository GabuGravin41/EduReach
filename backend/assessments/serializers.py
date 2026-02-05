from rest_framework import serializers
from .models import Assessment, Question, UserAttempt, AssessmentAnswerImage
from users.serializers import UserSerializer


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for Question model."""
    
    class Meta:
        model = Question
        fields = [
            'id', 'assessment', 'question_text', 'question_type',
            'options', 'correct_answer', 'points', 'order', 'explanation'
        ]
        read_only_fields = ['id']


class QuestionWithoutAnswerSerializer(serializers.ModelSerializer):
    """Serializer for Question model without correct answer (for students)."""
    
    class Meta:
        model = Question
        fields = [
            'id', 'question_text', 'question_type',
            'options', 'points', 'order'
        ]


class AssessmentSerializer(serializers.ModelSerializer):
    """Serializer for Assessment model."""
    creator = UserSerializer(read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'topic', 'description', 'creator',
            'time_limit_minutes', 'is_public', 'questions', 'share_token',
            'question_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        return obj.questions.count()


class AssessmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for assessment lists."""
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    question_count = serializers.SerializerMethodField()
    related_lessons = serializers.SerializerMethodField()
    
    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'topic', 'description',
            'creator_username', 'time_limit_minutes', 'share_token',
            'question_count', 'related_lessons', 'created_at'
        ]

    def get_question_count(self, obj):
        return obj.questions.count()
    
    def get_related_lessons(self, obj):
        """Get all related lessons (source + tagged)."""
        lessons = obj.get_all_related_lessons()
        return [{
            'id': lesson.id,
            'title': lesson.title,
            'video_id': lesson.video_id,
            'course_title': lesson.course.title
        } for lesson in lessons]


class AssessmentAnswerImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentAnswerImage
        fields = ['id', 'attempt', 'question_id', 'image', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class UserAttemptSerializer(serializers.ModelSerializer):
    """Serializer for UserAttempt model."""
    assessment_title = serializers.CharField(source='assessment.title', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    answer_images = AssessmentAnswerImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = UserAttempt
        fields = [
            'id', 'user', 'user_username', 'assessment',
            'assessment_title', 'status', 'score', 'percentage',
            'answers', 'answer_images', 'started_at', 'submitted_at', 'time_taken_minutes'
        ]
        read_only_fields = [
            'id', 'user', 'score', 'percentage',
            'started_at', 'submitted_at', 'time_taken_minutes'
        ]


class SubmitAnswersSerializer(serializers.Serializer):
    """Serializer for submitting assessment answers."""
    answers = serializers.JSONField()


class ManualGradeSerializer(serializers.Serializer):
    attempt_id = serializers.IntegerField()
    score = serializers.CharField(max_length=20)
    percentage = serializers.FloatField()
