from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, NotificationViewSet, PushSubscriptionView, VapidPublicKeyView, GoogleLoginView, institution_list

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    # Web Push subscription management
    path('notifications/push/subscribe/', PushSubscriptionView.as_view(), name='push-subscribe'),
    path('notifications/push/vapid-key/', VapidPublicKeyView.as_view(), name='vapid-public-key'),
    path('institutions/', institution_list, name='institution-list'),
]
