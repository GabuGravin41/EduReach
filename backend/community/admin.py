from django.contrib import admin
from .models import Post, Comment, Like


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    readonly_fields = ['author', 'created_at']


class LikeInline(admin.TabularInline):
    model = Like
    extra = 0
    readonly_fields = ['user', 'created_at']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'content_preview', 'like_count', 'comment_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'author__username']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CommentInline, LikeInline]

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'post', 'content_preview', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'author__username', 'post__content']
    readonly_fields = ['created_at', 'updated_at']

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'post', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'post__content']
    readonly_fields = ['created_at']
