from django.contrib import admin
from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'created_at', 'updated_at']
    list_filter = ['created_at', 'user']
    search_fields = ['user__username', 'lesson__title', 'content']
    readonly_fields = ['created_at', 'updated_at']
