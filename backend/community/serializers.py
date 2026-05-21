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
    helpful_votes = serializers.SerializerMethodField()
    not_helpful_votes = serializers.SerializerMethodField()
    user_vote_type = serializers.SerializerMethodField()

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
            'helpful_votes',
            'not_helpful_votes',
            'user_vote_type',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'thread', 'author', 'helpful_votes', 'not_helpful_votes', 'created_at', 'updated_at']

    def get_helpful_votes(self, obj):
        return obj.helpful_votes

    def get_not_helpful_votes(self, obj):
        return obj.not_helpful_votes

    def get_user_vote_type(self, obj):
        """Get the current user's vote type for this reply."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.vote_type if vote else None
        return None


class DiscussionThreadSerializer(serializers.ModelSerializer):
    """Serializer for discussion threads with nested replies."""
    author = UserBasicSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    replies = ThreadReplySerializer(many=True, read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    course_id = serializers.IntegerField(write_only=True, required=False)
    unit_id = serializers.IntegerField(write_only=True, required=False)
    channel_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = DiscussionThread
        fields = [
            'id',
            'channel',
            'channel_id',
            'course_id',
            'unit_id',
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

    def create(self, validated_data):
        from .models import CourseChannel

        course_id = validated_data.pop('course_id', None)
        unit_id = validated_data.pop('unit_id', None)
        channel_id = validated_data.pop('channel_id', None)

        # Also accept 'channel' from the raw request data (frontend may send it
        # even though the field is read-only on the serializer).
        if not channel_id and not course_id and not unit_id:
            channel_id = self.initial_data.get('channel')

        if channel_id:
            try:
                validated_data['channel'] = CourseChannel.objects.get(id=channel_id)
            except CourseChannel.DoesNotExist:
                raise serializers.ValidationError({'channel': 'Channel not found.'})
        elif unit_id:
            channel, _created = CourseChannel.objects.get_or_create(unit_id=unit_id)
            validated_data['channel'] = channel
        elif course_id:
            channel, _created = CourseChannel.objects.get_or_create(
                course_id=course_id,
            )
            validated_data['channel'] = channel
        return super().create(validated_data)


class DiscussionThreadListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for thread lists (no nested replies)."""
    author = UserBasicSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = DiscussionThread
        fields = [
            'id',
            'title',
            'author',
            'author_username',
            'is_pinned',
            'reply_count',
            'vote_count',
            'views',
            'created_at'
        ]
        read_only_fields = fields


class CourseChannelSerializer(serializers.ModelSerializer):
    """Serializer for discussion channels (course-linked or standalone community)."""
    threads = DiscussionThreadListSerializer(many=True, read_only=True)
    course_title = serializers.SerializerMethodField()
    course_id = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseChannel
        fields = [
            'id',
            'name',
            'display_name',
            'course',
            'course_id',
            'course_title',
            'threads',
            'created_at',
        ]
        read_only_fields = fields

    def get_course_title(self, obj):
        return obj.course.title if obj.course else None

    def get_course_id(self, obj):
        return obj.course.id if obj.course else None

    def get_display_name(self, obj):
        return obj.display_name
