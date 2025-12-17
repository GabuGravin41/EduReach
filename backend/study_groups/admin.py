from django.contrib import admin
from .models import StudyGroup, StudyGroupPost, StudyGroupChallenge, ChallengeParticipation


@admin.register(StudyGroup)
class StudyGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'course', 'is_public', 'max_members', 'member_count', 'created_at')
    list_filter = ('is_public', 'course')
    search_fields = ('name', 'description', 'creator__username')


@admin.register(StudyGroupPost)
class StudyGroupPostAdmin(admin.ModelAdmin):
    list_display = ('group', 'author', 'created_at')
    list_filter = ('group', 'created_at')
    search_fields = ('content', 'author__username', 'group__name')


@admin.register(StudyGroupChallenge)
class StudyGroupChallengeAdmin(admin.ModelAdmin):
    list_display = ('title', 'group', 'assessment', 'start_date', 'end_date')
    list_filter = ('group', 'start_date')
    search_fields = ('title', 'description', 'group__name')


@admin.register(ChallengeParticipation)
class ChallengeParticipationAdmin(admin.ModelAdmin):
    list_display = ('challenge', 'user', 'score', 'completed', 'last_updated')
    list_filter = ('completed', 'challenge')
    search_fields = ('user__username', 'challenge__title')
