from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
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


# ============================================================================
# DISCUSSION CHANNEL VIEWSETS (Priority 1 Feature)
# ============================================================================

class CourseChannelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Retrieve course discussion channels.
    GET /api/community/channels/ - List all
    GET /api/community/channels/<id>/ - Detail
    GET /api/community/channels/<id>/threads/ - Threads in channel
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from .models import CourseChannel
        return CourseChannel.objects.all()

    def get_serializer_class(self):
        from .serializers import CourseChannelSerializer
        return CourseChannelSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(
        detail=True,
        methods=['get'],
        url_path='threads',
        url_name='channel-threads'
    )
    def get_threads(self, request, pk=None):
        """Get all threads in a channel with optional search and sorting."""
        from .models import CourseChannel
        from .serializers import DiscussionThreadListSerializer
        
        channel = self.get_object()
        threads = channel.threads.all()
        
        # Filter by search if provided
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            threads = threads.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
        
        # Sort
        sort_by = request.query_params.get('sort', '-created_at')
        threads = threads.order_by(sort_by)
        
        serializer = DiscussionThreadListSerializer(threads, many=True)
        return Response(serializer.data)


class DiscussionThreadViewSet(viewsets.ModelViewSet):
    """
    CRUD for discussion threads.
    POST /api/community/threads/ - Create new
    GET /api/community/threads/<id>/ - Get detail (increments views)
    PATCH /api/community/threads/<id>/ - Update
    DELETE /api/community/threads/<id>/ - Delete
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from .models import DiscussionThread
        return DiscussionThread.objects.all()

    def get_serializer_class(self):
        from .serializers import DiscussionThreadSerializer, DiscussionThreadListSerializer
        if self.action == 'list':
            return DiscussionThreadListSerializer
        return DiscussionThreadSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """Auto-set author to current user."""
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        """Only allow author or staff to update."""
        if serializer.instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                "Only the thread author can update this."
            )
        serializer.save()

    def perform_destroy(self, instance):
        """Only allow author or staff to delete."""
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                "Only the thread author can delete this."
            )
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        """Increment view count when thread is retrieved."""
        instance = self.get_object()
        instance.increment_views()
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        """Pin/unpin a thread (staff/instructor only)."""
        thread = self.get_object()
        
        # Allow staff or thread author
        if not (request.user.is_staff or thread.author == request.user):
            return Response(
                {'detail': 'Only staff or thread author can pin'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread.is_pinned = not thread.is_pinned
        thread.save()
        
        return Response({
            'is_pinned': thread.is_pinned,
            'message': f"Thread {'pinned' if thread.is_pinned else 'unpinned'}"
        })


class ThreadReplyViewSet(viewsets.ModelViewSet):
    """
    CRUD for thread replies.
    POST /api/community/replies/ - Create new
    PATCH /api/community/replies/<id>/ - Update
    DELETE /api/community/replies/<id>/ - Delete
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from .models import ThreadReply
        return ThreadReply.objects.all()

    def get_serializer_class(self):
        from .serializers import ThreadReplySerializer
        return ThreadReplySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """Auto-set author to current user."""
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        """Only allow author or staff to update."""
        if serializer.instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                "Only the reply author can update this."
            )
        serializer.save()

    def perform_destroy(self, instance):
        """Only allow author or staff to delete."""
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                "Only the reply author can delete this."
            )
        instance.delete()

    @action(detail=True, methods=['post'])
    def mark_as_accepted(self, request, pk=None):
        """Mark reply as accepted answer."""
        from .models import ThreadReply
        reply = self.get_object()
        thread = reply.thread
        
        # Only thread author can mark as accepted
        if thread.author != request.user:
            return Response(
                {'detail': 'Only thread author can mark answers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reply.is_accepted = not reply.is_accepted
        reply.save()
        
        return Response({
            'is_accepted': reply.is_accepted,
            'message': f"Answer {'marked' if reply.is_accepted else 'unmarked'} as accepted"
        })

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark reply as verified by instructor/staff."""
        from .models import ThreadReply
        reply = self.get_object()
        
        # Check if user is staff/instructor
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only staff can verify answers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reply.is_verified = not reply.is_verified
        reply.save()
        
        return Response({
            'is_verified': reply.is_verified,
            'message': f"Reply {'verified' if reply.is_verified else 'unverified'}"
        })


class UpvoteReplyView(APIView):
    """
    Upvote/remove upvote on a reply.
    POST /api/community/replies/<reply_id>/upvote/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reply_id):
        from .models import ThreadReply, ThreadVote
        
        reply = get_object_or_404(ThreadReply, id=reply_id)
        
        # Check if user already voted
        vote = ThreadVote.objects.filter(
            reply=reply,
            user=request.user
        ).first()
        
        if vote:
            # Remove vote
            vote.delete()
            reply.upvotes = max(0, reply.upvotes - 1)
            reply.save()
            return Response({
                'upvotes': reply.upvotes,
                'user_upvoted': False,
                'message': 'Upvote removed'
            })
        else:
            # Add vote
            ThreadVote.objects.create(
                reply=reply,
                user=request.user
            )
            reply.upvotes += 1
            reply.save()
            return Response({
                'upvotes': reply.upvotes,
                'user_upvoted': True,
                'message': 'Upvoted!'
            })
