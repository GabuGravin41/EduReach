from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer, UserProfileSerializer


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user profiles."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

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
