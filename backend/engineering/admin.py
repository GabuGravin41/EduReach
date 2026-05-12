from django.contrib import admin
from .models import EngineeringProblem


@admin.register(EngineeringProblem)
class EngineeringProblemAdmin(admin.ModelAdmin):
    list_display = ('unit_code', 'question_number', 'source_file', 'year', 'difficulty', 'solution_status', 'has_diagram')
    list_filter = ('unit_code', 'difficulty', 'solution_status', 'has_diagram', 'year')
    search_fields = ('unit_code', 'unit_name', 'question_text', 'tags')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('unit_code', 'year', 'question_number')
