from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import json
User = get_user_model()


class Assessment(models.Model):
    """Model for assessments/quizzes."""
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
    is_public = models.BooleanField(default=True)
    
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
    
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
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_taken_minutes = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.assessment.title}"

    class Meta:
        ordering = ['-started_at']

    def calculate_score(self):
        """Calculate the score for the attempt."""
        from django.utils import timezone
        
        total_points = 0
        earned_points = 0
        
        for question in self.assessment.questions.all():
            total_points += question.points
            user_answer = self.answers.get(str(question.id), '')
            
            if question.question_type in ['mcq', 'true_false']:
                if user_answer.lower() == question.correct_answer.lower():
                    earned_points += question.points
            elif question.question_type == 'short_answer':
                if user_answer.lower().strip() == question.correct_answer.lower().strip():
                    earned_points += question.points
        
        self.score = f"{earned_points}/{total_points}"
        self.percentage = (earned_points / total_points * 100) if total_points > 0 else 0
        self.status = self.Status.GRADED
        self.submitted_at = timezone.now()
        
        if self.started_at:
            time_diff = self.submitted_at - self.started_at
            self.time_taken_minutes = int(time_diff.total_seconds() / 60)
        
        self.save()


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
