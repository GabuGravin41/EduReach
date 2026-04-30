from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from .models import User, Notification
from .serializers import UserSerializer, UserProfileSerializer, ChallengeableUserSerializer
from courses.models import Course
from assessments.models import Assessment


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user profiles."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    # MultiPartParser + FormParser allow profile photo uploads via PATCH /me/
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """Users can only see their own profile unless they are staff."""
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """Get or update current user's profile."""
        if request.method == 'GET':
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)
        
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=request.method == 'PATCH'
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def upgrade_tier(self, request):
        """Upgrade user's subscription tier."""
        user = request.user
        new_tier = request.data.get('tier')
        
        if new_tier not in dict(User.Tier.choices):
            return Response(
                {'error': 'Invalid tier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only admin users can switch to admin tier or change to any tier
        # Regular users can only upgrade their own subscription (not to admin)
        if new_tier == User.Tier.ADMIN and user.tier != User.Tier.ADMIN:
            return Response(
                {'error': 'You do not have permission to upgrade to admin tier'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.tier = new_tier
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['get'], url_path='challengeable')
    def challengeable(self, request):
        """List other site users that can be challenged (for challenge-a-friend)."""
        qs = User.objects.exclude(id=request.user.id).order_by('username')
        serializer = ChallengeableUserSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Global XP leaderboard."""
        # Top 10 public users
        top_users = User.objects.filter(show_xp_publicly=True).order_by('-xp_points')[:10]
        serializer = UserSerializer(top_users, many=True)
        
        # User's own rank
        user_rank = User.objects.filter(show_xp_publicly=True, xp_points__gt=request.user.xp_points).count() + 1
        
        return Response({
            'top_users': serializer.data,
            'user_rank': user_rank if request.user.show_xp_publicly else None,
            'user_stats': UserSerializer(request.user).data
        })

    @action(detail=False, methods=['get'], url_path='admin/stats')
    def admin_stats(self, request):
        """Platform-wide stats for admin dashboard. Staff/admin only."""
        if not request.user.is_authenticated or (getattr(request.user, 'tier', None) != User.Tier.ADMIN and not request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            'total_users': User.objects.count(),
            'courses_created': Course.objects.count(),
            'active_assessments': Assessment.objects.count(),
        })

    @action(detail=False, methods=['get'], url_path='me/usage')
    def usage(self, request):
        """Current user's monthly usage and tier limits for the frontend."""
        try:
            usage = request.user.get_current_usage()
        except Exception:
            return Response(
                {'error': 'Could not load usage.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        limits = usage.get_tier_limits()
        resets_at = getattr(usage, 'resets_at', None)
        if resets_at is not None and hasattr(resets_at, 'isoformat'):
            resets_at = resets_at.isoformat()
        return Response({
            'assessments_used': usage.assessments_created,
            'assessments_limit': limits['assessments'] if limits['assessments'] != float('inf') else None,
            'courses_used': usage.courses_created,
            'courses_limit': limits['courses'] if limits['courses'] != float('inf') else None,
            'ai_queries_used': usage.ai_queries_used,
            'ai_queries_limit': limits['ai_queries'] if limits['ai_queries'] != float('inf') else None,
            'resets_at': resets_at,
        })


class NotificationViewSet(viewsets.ViewSet):
    """Manage in-app notifications for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Return all unread notifications for the current user, newest first."""
        notifs = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).select_related('sender')[:50]
        data = [
            {
                'id': n.id,
                'notif_type': n.notif_type,
                'title': n.title,
                'message': n.message,
                'assessment_id': n.assessment_id,
                'share_token': n.share_token,
                'sender_username': n.sender.username if n.sender else None,
                'created_at': n.created_at.isoformat(),
            }
            for n in notifs
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notif = Notification.objects.filter(pk=pk, recipient=request.user).first()
        if not notif:
            return Response({'detail': 'Not found.'}, status=404)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'detail': 'Marked as read.'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})


class PushSubscriptionView(APIView):
    """
    Register or unregister a Web Push subscription for the current user/device.

    POST  /api/notifications/push/subscribe/    — save or refresh a subscription
    DELETE /api/notifications/push/subscribe/   — unsubscribe (mark inactive)
    GET   /api/notifications/push/vapid-key/    — return VAPID public key for browser
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import PushSubscription  # noqa: PLC0415

        endpoint = (request.data.get('endpoint') or '').strip()
        keys = request.data.get('keys') or {}
        p256dh = (keys.get('p256dh') or '').strip()
        auth = (keys.get('auth') or '').strip()

        if not endpoint or not p256dh or not auth:
            return Response(
                {'detail': 'endpoint, keys.p256dh, and keys.auth are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ua = request.META.get('HTTP_USER_AGENT', '')[:300]

        # Upsert: update existing if endpoint already known, else create
        sub, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': p256dh,
                'auth': auth,
                'user_agent': ua,
                'is_active': True,
            },
        )
        return Response(
            {'detail': 'Subscription saved.', 'created': created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        from .models import PushSubscription  # noqa: PLC0415

        endpoint = (request.data.get('endpoint') or '').strip()
        if not endpoint:
            return Response({'detail': 'endpoint is required.'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.filter(endpoint=endpoint, user=request.user).update(is_active=False)
        return Response({'detail': 'Unsubscribed.'})


class VapidPublicKeyView(APIView):
    """Return the VAPID public key for the frontend to subscribe with."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings as django_settings  # noqa: PLC0415
        key = getattr(django_settings, 'VAPID_PUBLIC_KEY', '')
        if not key:
            return Response({'detail': 'Push notifications not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'vapid_public_key': key})


class GoogleLoginView(APIView):
    """
    Endpoint to verify Google ID token and return JWT tokens.
    POST /api/users/google-login/
    {
        "token": "..."
    }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify the token with Google
            client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
            if not client_id:
                return Response({'error': 'Google authentication is not configured on the server'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
            
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            
            if not email:
                return Response({'error': 'Google token did not provide an email address'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': first_name,
                    'last_name': last_name,
                }
            )
            
            # If user existed but without first/last name (from another signup method), update them
            if not created and (not user.first_name or not user.last_name):
                user.first_name = user.first_name or first_name
                user.last_name = user.last_name or last_name
                user.save(update_fields=['first_name', 'last_name'])

            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'is_new_user': created
            })

        except ValueError as e:
            return Response({'error': f'Invalid token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
