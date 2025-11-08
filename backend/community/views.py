from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Post, Comment, Like
from .serializers import (
    PostSerializer, PostListSerializer,
    CommentSerializer, LikeSerializer
)


class PostViewSet(viewsets.ModelViewSet):
    """ViewSet for managing posts."""
    queryset = Post.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return PostListSerializer
        return PostSerializer

    def get_serializer_context(self):
        """Pass request context to serializers."""
        return {'request': self.request}

    def perform_create(self, serializer):
        """Set the author to the current user."""
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        """Only allow the author to update their post."""
        if serializer.instance.author != self.request.user:
            raise permissions.PermissionDenied(
                "You can only edit your own posts."
            )
        serializer.save()

    def perform_destroy(self, instance):
        """Only allow the author to delete their post."""
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                "You can only delete your own posts."
            )
        instance.delete()

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get all comments for a post."""
        post = self.get_object()
        comments = post.comments.all()
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        """Add a comment to a post."""
        post = self.get_object()
        serializer = CommentSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(author=request.user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Toggle like on a post."""
        post = self.get_object()
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        
        if not created:
            # Unlike if already liked
            like.delete()
            return Response(
                {'message': 'Post unliked', 'liked': False},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'Post liked', 'liked': True},
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """Get posts created by the current user."""
        posts = Post.objects.filter(author=request.user)
        serializer = PostListSerializer(
            posts,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing comments."""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """Set the author to the current user."""
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        """Only allow the author to update their comment."""
        if serializer.instance.author != self.request.user:
            raise permissions.PermissionDenied(
                "You can only edit your own comments."
            )
        serializer.save()

    def perform_destroy(self, instance):
        """Only allow the author to delete their comment."""
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                "You can only delete your own comments."
            )
        instance.delete()
