from django.contrib import admin

from .models import Unit, UserEnrolledUnit


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'track', 'institution', 'level', 'is_official')
    list_filter = ('track', 'is_official', 'institution')
    search_fields = ('name', 'code', 'syllabus_summary')


@admin.register(UserEnrolledUnit)
class UserEnrolledUnitAdmin(admin.ModelAdmin):
    list_display = ('user', 'unit', 'enrolled_at')
    list_filter = ('unit__track',)
    search_fields = ('user__username', 'unit__name', 'unit__code')
