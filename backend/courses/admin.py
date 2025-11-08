from django.contrib import admin
from .models import Course, Lesson, UserProgress


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'is_public', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['title', 'description', 'owner__username']
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'video_id']
    list_filter = ['course']
    search_fields = ['title', 'course__title']
    ordering = ['course', 'order']


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'progress_percentage', 'last_accessed']
    list_filter = ['last_accessed', 'started_at']
    search_fields = ['user__username', 'course__title']
