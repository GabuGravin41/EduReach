from django.contrib import admin
from .models import Assessment, Question, UserAttempt


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'topic', 'creator', 'time_limit_minutes', 'is_public', 'created_at']
    list_filter = ['is_public', 'created_at', 'topic']
    search_fields = ['title', 'topic', 'description', 'creator__username']
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_text', 'assessment', 'question_type', 'points', 'order']
    list_filter = ['question_type', 'assessment']
    search_fields = ['question_text', 'assessment__title']
    ordering = ['assessment', 'order']


@admin.register(UserAttempt)
class UserAttemptAdmin(admin.ModelAdmin):
    list_display = ['user', 'assessment', 'status', 'score', 'percentage', 'started_at']
    list_filter = ['status', 'started_at', 'submitted_at']
    search_fields = ['user__username', 'assessment__title']
    readonly_fields = ['score', 'percentage', 'started_at', 'submitted_at']
