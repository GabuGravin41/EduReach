from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
import json
User = get_user_model()


class Assessment(models.Model):
    """Model for assessments/quizzes."""
    class AssessmentType(models.TextChoices):
        QUIZ = 'quiz', 'Quiz'
        EXAM = 'exam', 'Exam'
    class ResultsVisibility(models.TextChoices):
        PRIVATE = 'private', 'Private (Instructor only)'
        OPT_IN_PUBLIC = 'opt_in_public', 'Students choose public/private'
        PUBLIC = 'public', 'Public to all participants'

    title = models.CharField(max_length=200)
    topic = models.CharField(max_length=100)
    description = models.TextField()
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_assessments'
    )
    time_limit_minutes = models.PositiveIntegerField(default=30)
    image_upload_grace_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Minutes after the test where image uploads are still allowed.',
    )
    assessment_type = models.CharField(
        max_length=10,
        choices=AssessmentType.choices,
        default=AssessmentType.EXAM,
        help_text='Whether this is a quiz (lighter) or exam (more rigorous).',
    )
    is_public = models.BooleanField(default=True)
    results_visibility = models.CharField(
        max_length=20,
        choices=ResultsVisibility.choices,
        default=ResultsVisibility.OPT_IN_PUBLIC,
        help_text='Controls whether student results are visible publicly.'
    )
    
    # ── Institutional metadata (for past papers & admin uploads) ────────────
    institution = models.ForeignKey(
        'users.Institution',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assessments',
        help_text='School or organisation this paper comes from.',
    )
    source_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Year the original exam was sat (e.g. 2023).',
    )
    source_attribution = models.CharField(
        max_length=300,
        blank=True,
        help_text='Human-readable credit line, e.g. "Kenyatta University — Engineering, 2023 Final".',
    )
    source_url = models.URLField(
        blank=True,
        help_text='Link to the original source (e.g. university past-paper portal, Olympiad archive).',
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text='List of searchable tag strings, e.g. ["calculus","engineering","KU"].',
    )

    # Video linking - for quizzes generated from or associated with videos
    source_lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_assessments',
        help_text='Lesson this quiz was generated from'
    )
    related_lessons = models.ManyToManyField(
        'courses.Lesson',
        blank=True,
        related_name='related_assessments',
        help_text='Videos tagged as relevant to this assessment'
    )

    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    # ── Teacher / contest controls ───────────────────────────────────────────
    allow_students_see_results = models.BooleanField(
        default=True,
        help_text='When False, only the creator can see student results (useful for contests).',
    )

    # Proctoring — optional monitoring mode for official exams
    is_proctored = models.BooleanField(
        default=False,
        help_text='When enabled, learners must have camera on and cannot switch tabs freely.',
    )
    proctor_tab_limit = models.PositiveIntegerField(
        default=3,
        help_text='Number of tab-switch violations allowed before the attempt is auto-submitted.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
        unique_together = ['creator', 'title']
    
    def get_all_related_lessons(self):
        """Get all related lessons (source + tagged)."""
        lessons = list(self.related_lessons.all())
        if self.source_lesson and self.source_lesson not in lessons:
            lessons.insert(0, self.source_lesson)
        return lessons


class Question(models.Model):
    """Model for questions in assessments."""
    
    class QuestionType(models.TextChoices):
        MCQ = 'mcq', 'Multiple Choice'
        TRUE_FALSE = 'true_false', 'True/False'
        SHORT_ANSWER = 'short_answer', 'Short Answer'
        ESSAY = 'essay', 'Essay'

    assessment = models.ForeignKey(
        Assessment,
        related_name='questions',
        on_delete=models.CASCADE
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.MCQ
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='List of options for MCQ questions'
    )
    correct_answer = models.TextField()
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    explanation = models.TextField(blank=True)
    source_url = models.URLField(
        blank=True,
        help_text='Link to the original source for this specific question (overrides assessment-level source_url).',
    )

    def __str__(self):
        return f"{self.assessment.title} - Q{self.order}"

    class Meta:
        ordering = ['order']


class UserAttempt(models.Model):
    """Model for tracking user attempts at assessments."""
    
    class Status(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'In Progress'
        SUBMITTED = 'submitted', 'Submitted'
        GRADED = 'graded', 'Graded'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assessment_attempts'
    )
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS
    )
    score = models.CharField(max_length=20, default='0/0')
    percentage = models.FloatField(default=0.0)
    answers = models.JSONField(default=dict)
    question_results = models.JSONField(
        default=dict,
        blank=True,
        help_text='Per-question grading results: {question_id: {score, max_score, is_correct, ai_graded}}'
    )
    is_public_result = models.BooleanField(
        default=False,
        help_text='Whether this attempt result is visible to other students.'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_taken_minutes = models.PositiveIntegerField(null=True, blank=True)
    time_taken_seconds = models.PositiveIntegerField(null=True, blank=True)
    xp_earned = models.PositiveIntegerField(default=0)

    XP_WEIGHTS = {
        'mcq': 10,
        'true_false': 5,
        'short_answer': 15,
        'essay': 25,
        'passage': 20,
        'cloze': 10
    }

    def __str__(self):
        return f"{self.user.username} - {self.assessment.title}"

    class Meta:
        ordering = ['-started_at']

    def _assessment_needs_ai_grading(self):
        """True if this attempt's assessment has any question that requires AI (essay or short_answer with model solution)."""
        for q in self.assessment.questions.all():
            q_type = getattr(q, 'question_type', 'short_answer')
            if q_type == 'essay':
                return True
            if q_type == 'short_answer' and (getattr(q, 'explanation', None) or '').strip():
                return True
        return False

    def calculate_score(self):
        """Calculate the score and XP for the attempt.
        Auto-grades MCQ, true_false, short_answer (exact match). For essay and for
        short_answer with model solution (explanation), uses token-efficient AI grading;
        AI grading counts against the user's monthly quota.
        """
        from django.utils import timezone

        total_points = 0
        earned_points = 0
        total_xp = 0
        per_question = {}

        for question in self.assessment.questions.all():
            total_points += question.points
            user_answer = (self.answers.get(str(question.id), '') or '').strip()
            user_answer_raw = self.answers.get(str(question.id), '') or ''

            q_type = getattr(question, 'question_type', 'short_answer')
            xp_weight = self.XP_WEIGHTS.get(q_type, 10)

            is_correct = False
            if q_type in ['mcq', 'true_false']:
                if user_answer_raw.lower() == str(question.correct_answer).lower():
                    is_correct = True
                per_question[str(question.id)] = {
                    'score': question.points if is_correct else 0,
                    'max_score': question.points,
                    'is_correct': is_correct,
                    'ai_graded': False,
                }
            elif q_type == 'short_answer':
                ref = (getattr(question, 'explanation', None) or '').strip()
                # Passage-style / long text with model solution: AI-grade (counts toward quota)
                if ref and len(user_answer) > 80:
                    pts = 0
                    try:
                        from ai_service.essay_grading import grade_essay_answer
                        pts = grade_essay_answer(ref, user_answer_raw, question.points, user=self.user)
                        earned_points += pts
                        total_xp += int((pts / question.points) * xp_weight) if question.points else 0
                    except Exception:
                        pass
                    per_question[str(question.id)] = {
                        'score': pts,
                        'max_score': question.points,
                        'is_correct': pts >= question.points,
                        'ai_graded': True,
                    }
                    continue
                if user_answer.lower() == str(question.correct_answer).lower().strip():
                    is_correct = True
                per_question[str(question.id)] = {
                    'score': question.points if is_correct else 0,
                    'max_score': question.points,
                    'is_correct': is_correct,
                    'ai_graded': False,
                }
            elif q_type == 'essay':
                ref = getattr(question, 'explanation', None) or ''
                pts = 0
                if ref.strip():
                    try:
                        from ai_service.essay_grading import grade_essay_answer
                        pts = grade_essay_answer(ref, user_answer_raw, question.points, user=self.user)
                        earned_points += pts
                        total_xp += int((pts / question.points) * xp_weight) if question.points else 0
                    except Exception:
                        pass
                per_question[str(question.id)] = {
                    'score': pts,
                    'max_score': question.points,
                    'is_correct': pts >= question.points,
                    'ai_graded': True,
                }
                continue

            if is_correct:
                earned_points += question.points
                total_xp += xp_weight

        self.question_results = per_question

        self.score = f"{earned_points}/{total_points}"
        self.percentage = (earned_points / total_points * 100) if total_points > 0 else 0
        self.status = self.Status.GRADED
        if not self.submitted_at:
            self.submitted_at = timezone.now()
        
        if self.started_at:
            time_diff = self.submitted_at - self.started_at
            self.time_taken_seconds = int(time_diff.total_seconds())
            self.time_taken_minutes = int(self.time_taken_seconds / 60)
            
            # Add time spent to user total
            self.user.total_time_spent_seconds = models.F('total_time_spent_seconds') + self.time_taken_seconds
            self.user.save(update_fields=['total_time_spent_seconds'])
            self.user.refresh_from_db()
        
        # Award XP
        if total_xp > 0 and self.xp_earned == 0:
            self.xp_earned = total_xp
            self.user.award_xp(
                amount=total_xp,
                transaction_type='assessment_submit',
                category='assessment',
                description=f"Completed assessment: {self.assessment.title}",
                related_object_id=self.id
            )
        
        self.save()


class AssessmentAnswerImage(models.Model):
    """Image upload for a specific question in an assessment attempt."""

    attempt = models.ForeignKey(
        UserAttempt,
        on_delete=models.CASCADE,
        related_name='answer_images'
    )
    question_id = models.CharField(max_length=100)
    image = models.ImageField(upload_to='assessment_answers/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ['attempt', 'question_id', 'image']

    def __str__(self):
        return f"Answer image for attempt {self.attempt_id} q{self.question_id}"


class VideoNotes(models.Model):
    """Model for user notes on YouTube videos."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_notes'
    )
    video_id = models.CharField(max_length=20, help_text="YouTube video ID")
    notes = models.TextField(blank=True, help_text="User's notes about the video")
    timestamps = models.JSONField(
        default=list,
        help_text="List of timestamped notes: [{'time': 120, 'note': 'Important point'}]"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'video_id')
        ordering = ['-updated_at']
        verbose_name = "Video Notes"
        verbose_name_plural = "Video Notes"
    
    def __str__(self):
        return f"{self.user.username}'s notes for video {self.video_id}"
    
    @property
    def word_count(self):
        """Count words in notes."""
        return len(self.notes.split()) if self.notes else 0
    
    @property
    def timestamp_count(self):
        """Count timestamped notes."""
        return len(self.timestamps) if self.timestamps else 0
    
    def add_timestamp_note(self, time_seconds, note_text):
        """Add a timestamped note."""
        if not self.timestamps:
            self.timestamps = []
        
        self.timestamps.append({
            'time': time_seconds,
            'note': note_text,
            'created_at': timezone.now().isoformat()
        })
        
        # Sort by time
        self.timestamps.sort(key=lambda x: x['time'])
        self.save()
    
    def get_video_url(self):
        """Get the YouTube URL for this video."""
        return f"https://www.youtube.com/watch?v={self.video_id}"


class ExamSession(models.Model):
    """
    A PIN-gated exam session created by a teacher.
    Students join with a 6-digit PIN and their display name — no account required.
    """
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name='exam_sessions',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_exam_sessions',
    )
    pin = models.CharField(max_length=8, unique=True, db_index=True)
    title = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    allow_anonymous = models.BooleanField(
        default=True,
        help_text='When True, students can join with just a display name (no EduReach account needed).',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {self.pin} — {self.assessment.title}"


class GuestAttempt(models.Model):
    """
    An anonymous assessment attempt from a PIN session participant.
    Linked to an ExamSession, identified by display name only.
    """
    session = models.ForeignKey(
        ExamSession,
        on_delete=models.CASCADE,
        related_name='guest_attempts',
    )
    display_name = models.CharField(max_length=100)
    answers = models.JSONField(default=dict)
    question_results = models.JSONField(default=dict)
    score = models.CharField(max_length=20, default='0/0')
    percentage = models.FloatField(default=0.0)
    status = models.CharField(
        max_length=20,
        choices=[('in_progress', 'In Progress'), ('submitted', 'Submitted'), ('graded', 'Graded')],
        default='in_progress',
    )
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']
        unique_together = ['session', 'display_name']

    def __str__(self):
        return f"{self.display_name} in {self.session}"
