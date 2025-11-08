from rest_framework import serializers
from .models import Post, Comment, Like
from users.serializers import UserSerializer


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
