from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PostViewSet, 
    CommentViewSet,
    DiscussionThreadViewSet,
    ThreadReplyViewSet,
    CourseChannelViewSet,
    VoteReplyView
)

router = DefaultRouter()
router.register(r'posts', PostViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'threads', DiscussionThreadViewSet, basename='thread')
router.register(r'replies', ThreadReplyViewSet, basename='reply')
router.register(r'channels', CourseChannelViewSet, basename='channel')

urlpatterns = [
    path('', include(router.urls)),
    path('replies/<int:reply_id>/vote/', VoteReplyView.as_view(), name='vote-reply'),
]
