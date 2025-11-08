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
