from rest_framework import serializers
from .models import Assessment, Question, QuestionImage, UserAttempt, AssessmentAnswerImage
from users.serializers import UserSerializer
from courses.models import Lesson


class QuestionImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = QuestionImage
        fields = ['id', 'filename', 'image_url']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for Question model."""
    images = QuestionImageSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'assessment', 'question_text', 'question_type',
            'options', 'correct_answer', 'points', 'order', 'explanation', 'source_url',
            'images',
        ]
        read_only_fields = ['id']


class QuestionWithoutAnswerSerializer(serializers.ModelSerializer):
    """Serializer for Question model without correct answer (for students)."""
    images = QuestionImageSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'question_text', 'question_type',
            'options', 'points', 'order', 'images',
        ]


class AssessmentSerializer(serializers.ModelSerializer):
    """Serializer for Assessment model."""
    creator = UserSerializer(read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()
    questions_data = serializers.ListField(write_only=True, required=False)
    source_lesson = serializers.PrimaryKeyRelatedField(
        queryset=Lesson.objects.all(),
        required=False,
        allow_null=True,
    )
    
    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'topic', 'description', 'creator',
            'time_limit_minutes', 'image_upload_grace_minutes',
            'assessment_type',
            'is_public', 'results_visibility', 'allow_students_see_results',
            'is_proctored', 'proctor_tab_limit',
            'institution', 'source_year', 'source_attribution', 'source_url', 'tags',
            'competition_country', 'competition_name', 'competition_language',
            'questions', 'questions_data', 'share_token',
            'question_count', 'source_lesson', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'share_token', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        return obj.questions.count()

    def _create_questions_from_data(self, assessment, questions_data):
        """Create Question rows from questions_data (used by create and update)."""
        for idx, q in enumerate(questions_data):
            q_type = q.get('type') or q.get('question_type') or 'short_answer'

            if q_type in ['multiple_choice', 'mcq']:
                options = q.get('options') or []
                correct_idx = q.get('correct_answer_index', 0)
                try:
                    correct_answer = options[int(correct_idx)]
                except Exception:
                    correct_answer = options[0] if options else ''
                Question.objects.create(
                    assessment=assessment,
                    question_text=q.get('question_text') or q.get('question') or '',
                    question_type=Question.QuestionType.MCQ,
                    options=options,
                    correct_answer=correct_answer,
                    points=q.get('points', 1),
                    order=idx,
                    explanation=q.get('explanation', '')
                )
                continue

            if q_type in ['true_false', 'truefalse']:
                correct_bool = q.get('correct_answer', True)
                correct_answer = 'true' if bool(correct_bool) else 'false'
                Question.objects.create(
                    assessment=assessment,
                    question_text=q.get('question_text') or q.get('question') or '',
                    question_type=Question.QuestionType.TRUE_FALSE,
                    options=['true', 'false'],
                    correct_answer=correct_answer,
                    points=q.get('points', 1),
                    order=idx,
                    explanation=q.get('explanation', '')
                )
                continue

            if q_type == 'passage':
                sub_questions = q.get('questions') or []
                for sub_idx, sub_q in enumerate(sub_questions):
                    sub_type = sub_q.get('question_type', 'short_answer')
                    if sub_type == 'multiple_choice':
                        options = sub_q.get('options') or []
                        correct = sub_q.get('correct_answer', 0)
                        if isinstance(correct, int):
                            correct_answer = options[correct] if options and 0 <= correct < len(options) else ''
                        else:
                            correct_answer = str(correct)
                        Question.objects.create(
                            assessment=assessment,
                            question_text=sub_q.get('question_text') or '',
                            question_type=Question.QuestionType.MCQ,
                            options=options,
                            correct_answer=correct_answer,
                            points=sub_q.get('points', 1),
                            order=(idx * 100) + sub_idx,
                            explanation=sub_q.get('explanation', '')
                        )
                    else:
                        Question.objects.create(
                            assessment=assessment,
                            question_text=sub_q.get('question_text') or '',
                            question_type=Question.QuestionType.SHORT_ANSWER,
                            options=[],
                            correct_answer=str(sub_q.get('correct_answer', '')),
                            points=sub_q.get('points', 1),
                            order=(idx * 100) + sub_idx,
                            explanation=sub_q.get('explanation', '')
                        )
                continue

            if q_type == 'cloze':
                import re
                text = q.get('question_text', '')
                blanks = re.findall(r'\[(.*?)\]', text)
                for blank_idx, blank in enumerate(blanks):
                    Question.objects.create(
                        assessment=assessment,
                        question_text=f"{text} (blank #{blank_idx + 1})",
                        question_type=Question.QuestionType.SHORT_ANSWER,
                        options=[],
                        correct_answer=blank,
                        points=max(1, int((q.get('points', 2) or 2) / max(1, len(blanks)))),
                        order=(idx * 100) + blank_idx,
                        explanation=q.get('explanation', '')
                    )
                continue

            if q_type == 'essay':
                Question.objects.create(
                    assessment=assessment,
                    question_text=q.get('question_text') or q.get('question') or '',
                    question_type=Question.QuestionType.ESSAY,
                    options=[],
                    # Essays are manually graded, so keep a placeholder.
                    correct_answer='manual_grade',
                    points=q.get('points', 10),
                    order=idx,
                    explanation=q.get('explanation', '')
                )
                continue

            # Default fallback: short answer
            correct_answers = q.get('correct_answers') or []
            Question.objects.create(
                assessment=assessment,
                question_text=q.get('question_text') or q.get('question') or '',
                question_type=Question.QuestionType.SHORT_ANSWER,
                options=[],
                correct_answer=(correct_answers[0] if correct_answers else q.get('correct_answer', '')),
                points=q.get('points', 1),
                order=idx,
                explanation=q.get('explanation', '')
            )

    def create(self, validated_data):
        questions_data = validated_data.pop('questions_data', [])
        assessment = Assessment.objects.create(**validated_data)
        self._create_questions_from_data(assessment, questions_data)
        return assessment

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions_data', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if questions_data is not None:
            instance.questions.all().delete()
            self._create_questions_from_data(instance, questions_data)
        return instance


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
            'is_public', 'results_visibility', 'allow_students_see_results',
            'image_upload_grace_minutes',
            'assessment_type', 'is_proctored', 'proctor_tab_limit',
            'institution', 'source_year', 'source_attribution', 'source_url', 'tags',
            'competition_country', 'competition_name', 'competition_language',
            'source_lesson', 'question_count', 'related_lessons', 'created_at'
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
    assessment_type = serializers.CharField(source='assessment.assessment_type', read_only=True)
    has_ai_graded_questions = serializers.SerializerMethodField()
    user_username = serializers.CharField(source='user.username', read_only=True)
    answer_images = AssessmentAnswerImageSerializer(many=True, read_only=True)

    def get_has_ai_graded_questions(self, obj):
        """Returns True if the assessment has essay or AI-graded short_answer questions."""
        for q in obj.assessment.questions.all():
            if q.question_type == 'essay':
                return True
            if q.question_type == 'short_answer' and (q.explanation or '').strip():
                return True
        return False

    class Meta:
        model = UserAttempt
        fields = [
            'id', 'user', 'user_username', 'assessment',
            'assessment_title', 'assessment_type', 'has_ai_graded_questions',
            'status', 'score', 'percentage',
            'answers', 'question_results', 'answer_images', 'is_public_result',
            'started_at', 'submitted_at', 'time_taken_minutes', 'time_taken_seconds'
        ]
        read_only_fields = [
            'id', 'user', 'score', 'percentage', 'question_results',
            'started_at', 'submitted_at', 'time_taken_minutes', 'time_taken_seconds'
        ]


class SubmitAnswersSerializer(serializers.Serializer):
    """Serializer for submitting assessment answers."""
    answers = serializers.JSONField()


class ManualGradeSerializer(serializers.Serializer):
    attempt_id = serializers.IntegerField()
    score = serializers.CharField(max_length=20)
    percentage = serializers.FloatField()
