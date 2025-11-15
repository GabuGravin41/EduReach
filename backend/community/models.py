from django.db import models
from django.conf import settings


class Post(models.Model):
    """Model for community posts."""
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    content = models.TextField()
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.author.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        ordering = ['-created_at']

    @property
    def like_count(self):
        return self.likes.count()

    @property
    def comment_count(self):
        return self.comments.count()


class Comment(models.Model):
    """Model for comments on posts."""
    post = models.ForeignKey(
        Post,
        related_name='comments',
        on_delete=models.CASCADE
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.author.username} on {self.post.id}"

    class Meta:
        ordering = ['created_at']


class Like(models.Model):
    """Model for likes on posts."""
    post = models.ForeignKey(
        Post,
        related_name='likes',
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} likes {self.post.id}"

    class Meta:
        unique_together = ['post', 'user']
        ordering = ['-created_at']


# ============================================================================
# DISCUSSION CHANNELS & THREADS (Priority 1 Feature)
# ============================================================================

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
        ordering = ['-created_at']


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
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} upvoted reply {self.reply.id}"
