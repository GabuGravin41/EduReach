from django.contrib import admin
from .models import Course, Lesson, UserProgress, CoursePricing, ContentPurchase, CreatorTip, CreatorEarnings


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


@admin.register(CoursePricing)
class CoursePricingAdmin(admin.ModelAdmin):
    list_display = ['course', 'is_paid', 'price', 'currency', 'free_preview_lessons', 'allow_tips', 'updated_at']
    list_filter = ['is_paid', 'currency', 'allow_tips']
    search_fields = ['course__title']


@admin.register(ContentPurchase)
class ContentPurchaseAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'amount', 'currency', 'created_at']
    list_filter = ['currency', 'created_at']
    search_fields = ['user__username', 'course__title']


@admin.register(CreatorTip)
class CreatorTipAdmin(admin.ModelAdmin):
    list_display = ['from_user', 'to_creator', 'course', 'amount', 'currency', 'created_at']
    list_filter = ['currency', 'created_at']
    search_fields = ['from_user__username', 'to_creator__username', 'course__title']


@admin.register(CreatorEarnings)
class CreatorEarningsAdmin(admin.ModelAdmin):
    list_display = ['creator', 'month', 'gross_revenue', 'platform_fee', 'net_revenue', 'courses_sold']
    list_filter = ['month']
    search_fields = ['creator__username']
