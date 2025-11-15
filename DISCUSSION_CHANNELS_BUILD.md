# 🔧 Start Building: Discussion Channels Implementation Guide

> Let's start with **Priority 1: Discussion Channels** - the highest impact feature

---

## What We're Building

A Q&A system where students can ask questions about specific courses, get help from peers, and have instructors verify best answers.

```
Course Detail Page
├─ 📹 LESSONS tab
├─ 📋 ASSESSMENTS tab
└─ 💬 DISCUSSIONS tab (NEW!)
   ├─ Browse all questions
   ├─ Ask a new question
   ├─ View threaded replies
   ├─ Upvote helpful answers
   └─ Instructor can verify answers
```

---

## Step 1: Create Django Models

### File: `backend/community/models.py` (EXPAND)

Add these models to the existing file:

```python
# Add these imports
from django.utils import timezone

# Add these new models:

class CourseChannel(models.Model):
    """One discussion channel per course."""
    course = models.OneToOneField(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='discussion_channel'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Discussion for {self.course.title}"

    class Meta:
        verbose_name = "Course Discussion Channel"


class DiscussionThread(models.Model):
    """A question/topic in a course channel."""
    channel = models.ForeignKey(
        CourseChannel,
        on_delete=models.CASCADE,
        related_name='threads'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_threads'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    
    # Meta
    is_pinned = models.BooleanField(
        default=False,
        help_text="Instructor can pin important threads"
    )
    views = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        verbose_name = "Discussion Thread"

    @property
    def reply_count(self):
        return self.replies.count()

    @property
    def vote_count(self):
        """Total upvotes on all replies."""
        return sum(r.upvotes for r in self.replies.all())

    def increment_views(self):
        self.views += 1
        self.save(update_fields=['views'])


class ThreadReply(models.Model):
    """A reply to a discussion thread."""
    thread = models.ForeignKey(
        DiscussionThread,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='thread_replies'
    )
    content = models.TextField()
    
    # Metadata
    is_verified = models.BooleanField(
        default=False,
        help_text="Instructor can mark as verified/correct"
    )
    is_accepted = models.BooleanField(
        default=False,
        help_text="Thread author can mark as accepted answer"
    )
    upvotes = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reply to '{self.thread.title}' by {self.author.username}"

    class Meta:
        ordering = ['-is_accepted', '-is_verified', '-upvotes', '-created_at']
        verbose_name = "Thread Reply"


class ThreadVote(models.Model):
    """Track upvotes on replies (ensure unique votes)."""
    reply = models.ForeignKey(
        ThreadReply,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['reply', 'user']
        verbose_name = "Thread Vote"

    def __str__(self):
        return f"{self.user.username} upvoted reply {self.reply.id}"
```

---

## Step 2: Create Serializers

### File: `backend/community/serializers.py` (EXPAND/CREATE)

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CourseChannel, DiscussionThread, ThreadReply, ThreadVote
from courses.models import Course

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Minimal user info for display."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = fields


class ThreadReplySerializer(serializers.ModelSerializer):
    """Serializer for thread replies."""
    author = UserBasicSerializer(read_only=True)
    user_upvoted = serializers.SerializerMethodField()
    
    class Meta:
        model = ThreadReply
        fields = [
            'id',
            'thread',
            'author',
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
    replies = ThreadReplySerializer(many=True, read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = DiscussionThread
        fields = [
            'id',
            'channel',
            'author',
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
    author = UserBasicSerializer(read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = DiscussionThread
        fields = [
            'id',
            'title',
            'author',
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
    
    class Meta:
        model = CourseChannel
        fields = [
            'id',
            'course',
            'course_title',
            'threads',
            'created_at'
        ]
        read_only_fields = fields
```

---

## Step 3: Create API Endpoints

### File: `backend/community/urls.py`

```python
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    DiscussionThreadViewSet,
    ThreadReplyViewSet,
    CourseChannelViewSet,
    UpvoteReplyView
)

router = DefaultRouter()
router.register(r'threads', DiscussionThreadViewSet, basename='thread')
router.register(r'replies', ThreadReplyViewSet, basename='reply')
router.register(r'channels', CourseChannelViewSet, basename='channel')

urlpatterns = [
    path('replies/<int:reply_id>/upvote/', UpvoteReplyView.as_view(), name='upvote-reply'),
] + router.urls
```

### File: `backend/community/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from .models import (
    DiscussionThread,
    ThreadReply,
    CourseChannel,
    ThreadVote
)
from .serializers import (
    DiscussionThreadSerializer,
    DiscussionThreadListSerializer,
    ThreadReplySerializer,
    CourseChannelSerializer
)


class CourseChannelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Retrieve course discussion channels.
    GET /api/community/channels/ - List all
    GET /api/community/channels/<id>/ - Detail
    GET /api/community/channels/<id>/threads/ - Threads in channel
    """
    queryset = CourseChannel.objects.all()
    serializer_class = CourseChannelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

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
        """Get all threads in a channel."""
        channel = self.get_object()
        threads = channel.threads.all()
        
        # Filter by search if provided
        search = request.query_params.get('search')
        if search:
            threads = threads.filter(
                title__icontains=search
            ) | threads.filter(
                content__icontains=search
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
    queryset = DiscussionThread.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        """Use lighter serializer for list view."""
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

    def retrieve(self, request, *args, **kwargs):
        """Increment view count when thread is retrieved."""
        instance = self.get_object()
        instance.increment_views()
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        """Pin/unpin a thread (instructor only)."""
        thread = self.get_object()
        
        # Check if user is instructor (you may need to add this permission)
        # For now, allow thread author to pin
        if thread.author != request.user:
            return Response(
                {'detail': 'Only thread author can pin'},
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
    queryset = ThreadReply.objects.all()
    serializer_class = ThreadReplySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """Auto-set author to current user."""
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_accepted(self, request, pk=None):
        """Mark reply as accepted answer."""
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
        """Mark reply as verified by instructor."""
        reply = self.get_object()
        
        # Check if user is course instructor (you'll need to implement this check)
        # For now, just allow
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
    permission_classes = [IsAuthenticated]

    def post(self, request, reply_id):
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
```

---

## Step 4: Create Migrations

Run these commands:

```bash
# Generate migrations
python manage.py makemigrations community

# Apply migrations
python manage.py migrate community

# Test that models work
python manage.py shell
# Then in Python shell:
# from community.models import CourseChannel
# from courses.models import Course
# course = Course.objects.first()
# channel = CourseChannel.objects.create(course=course)
# print(channel)
```

---

## Step 5: Register in Admin

### File: `backend/community/admin.py`

```python
from django.contrib import admin
from .models import (
    CourseChannel,
    DiscussionThread,
    ThreadReply,
    ThreadVote
)


@admin.register(CourseChannel)
class CourseChannelAdmin(admin.ModelAdmin):
    list_display = ['course', 'created_at']
    readonly_fields = ['created_at']


@admin.register(DiscussionThread)
class DiscussionThreadAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'channel', 'is_pinned', 'reply_count', 'created_at']
    list_filter = ['is_pinned', 'created_at', 'channel']
    search_fields = ['title', 'content', 'author__username']
    readonly_fields = ['views', 'created_at', 'updated_at']
    fieldsets = (
        ('Content', {
            'fields': ('channel', 'author', 'title', 'content')
        }),
        ('Metadata', {
            'fields': ('is_pinned', 'views', 'created_at', 'updated_at')
        }),
    )


@admin.register(ThreadReply)
class ThreadReplyAdmin(admin.ModelAdmin):
    list_display = ['author', 'thread', 'is_verified', 'is_accepted', 'upvotes', 'created_at']
    list_filter = ['is_verified', 'is_accepted', 'created_at']
    search_fields = ['content', 'author__username', 'thread__title']
    readonly_fields = ['upvotes', 'created_at', 'updated_at']
    fieldsets = (
        ('Content', {
            'fields': ('thread', 'author', 'content')
        }),
        ('Status', {
            'fields': ('is_verified', 'is_accepted', 'upvotes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ThreadVote)
class ThreadVoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'reply', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'reply__content']
    readonly_fields = ['created_at']
```

---

## Step 6: Test with Django Shell

```bash
python manage.py shell
```

```python
from community.models import CourseChannel, DiscussionThread, ThreadReply
from courses.models import Course
from django.contrib.auth import get_user_model

User = get_user_model()

# Get a course
course = Course.objects.first()

# Create channel (or get it)
channel, created = CourseChannel.objects.get_or_create(course=course)

# Get a user
user = User.objects.first()

# Create a thread
thread = DiscussionThread.objects.create(
    channel=channel,
    author=user,
    title="How do hooks work?",
    content="I'm confused about dependency arrays..."
)

# Create a reply
reply = ThreadReply.objects.create(
    thread=thread,
    author=user,
    content="Dependency arrays control when the effect runs..."
)

print(thread)
print(reply)
print(f"Thread has {thread.reply_count} replies")
```

---

## Step 7: Update Main Community URLs

### File: `backend/api/urls.py`

Make sure community endpoints are included:

```python
# Add to your api/urls.py
from django.urls import path, include

urlpatterns = [
    # ... existing paths ...
    path('community/', include('community.urls')),  # <- Add this
]
```

---

## Step 8: Test with Postman/cURL

```bash
# Get all discussion channels
curl -X GET http://localhost:8000/api/community/channels/

# Get threads in a channel
curl -X GET http://localhost:8000/api/community/channels/1/threads/

# Create a new thread (requires auth)
curl -X POST http://localhost:8000/api/community/threads/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": 1,
    "title": "How do hooks work?",
    "content": "I need help understanding dependency arrays..."
  }'

# Create a reply
curl -X POST http://localhost:8000/api/community/replies/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "thread": 1,
    "content": "Dependency arrays control when effects run..."
  }'

# Upvote a reply
curl -X POST http://localhost:8000/api/community/replies/1/upvote/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Checklist

- [ ] Models created in `community/models.py`
- [ ] Serializers created in `community/serializers.py`
- [ ] ViewSets created in `community/views.py`
- [ ] URLs configured in `community/urls.py`
- [ ] Admin registered in `community/admin.py`
- [ ] Migrations created and applied
- [ ] API tested with Postman/cURL
- [ ] Ready for React frontend!

---

## Next: Build React Components

Once backend is working, you'll build:

1. `CourseDetailPage` - add "Discussions" tab
2. `DiscussionFeed` - list all threads
3. `DiscussionThread` - view + reply
4. `ThreadReplyCard` - individual reply with upvote
5. `CreateThreadModal` - new question form
6. `ReplyForm` - reply form

Need me to start building the frontend, or want to test the backend first? 🚀
