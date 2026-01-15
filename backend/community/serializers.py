from rest_framework import serializers
from .models import (
    Post,
    Comment,
    Like,
    CourseChannel,
    DiscussionThread,
    ThreadReply,
    ThreadVote,
)
from users.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model."""
    author = UserSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    
    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'author', 'author_username',
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class LikeSerializer(serializers.ModelSerializer):
    """Serializer for Like model."""
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'post', 'user', 'user_username', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    """Serializer for Post model."""
    author = UserSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_username', 'content', 'image',
            'comments', 'like_count', 'comment_count', 'is_liked',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_is_liked(self, obj):
        """Check if the current user has liked this post."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user).exists()
        return False


class PostListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for post lists."""
    author_username = serializers.CharField(source='author.username', read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author_username', 'content',
            'like_count', 'comment_count', 'is_liked',
            'created_at'
        ]

    def get_is_liked(self, obj):
        """Check if the current user has liked this post."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user).exists()
        return False


# ============================================================================
# DISCUSSION CHANNEL SERIALIZERS (Priority 1 Feature)
# ============================================================================

class UserBasicSerializer(serializers.ModelSerializer):
    """Minimal user info for display in discussions."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = fields


class ThreadVoteSerializer(serializers.ModelSerializer):
    """Serializer for thread votes (upvotes)."""
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ThreadVote
        fields = ['id', 'reply', 'user', 'user_username', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class ThreadReplySerializer(serializers.ModelSerializer):
    """Serializer for thread replies."""
    author = UserBasicSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    user_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = ThreadReply
        fields = [
            'id',
            'thread',
            'author',
            'author_username',
            'content',
            'is_verified',
            'is_accepted',
            'upvotes',
            'user_upvoted',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'thread', 'author', 'upvotes', 'created_at', 'updated_at']

    def get_user_upvoted(self, obj):
        """Check if current user upvoted this reply."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ThreadVote.objects.filter(
                reply=obj,
                user=request.user
            ).exists()
        return False


class DiscussionThreadSerializer(serializers.ModelSerializer):
    """Serializer for discussion threads with nested replies."""
    author = UserBasicSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    replies = ThreadReplySerializer(many=True, read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DiscussionThread
        fields = [
            'id',
            'channel',
            'author',
            'author_username',
            'title',
            'content',
            'is_pinned',
            'views',
            'reply_count',
            'vote_count',
            'replies',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'channel', 'author', 'views', 'created_at', 'updated_at']


class DiscussionThreadListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for thread lists (no nested replies)."""
    author_username = serializers.CharField(source='author.username', read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DiscussionThread
        fields = [
            'id',
            'title',
            'author_username',
            'is_pinned',
            'reply_count',
            'vote_count',
            'views',
            'created_at'
        ]
        read_only_fields = fields


class CourseChannelSerializer(serializers.ModelSerializer):
    """Serializer for course discussion channels."""
    threads = DiscussionThreadListSerializer(many=True, read_only=True)
    course_title = serializers.CharField(
        source='course.title',
        read_only=True
    )
    course_id = serializers.IntegerField(source='course.id', read_only=True)

    class Meta:
        model = CourseChannel
        fields = [
            'id',
            'course',
            'course_id',
            'course_title',
            'threads',
            'created_at'
        ]
        read_only_fields = fields
