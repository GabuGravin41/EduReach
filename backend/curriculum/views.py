from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Unit, UserEnrolledUnit
from .serializers import UnitSerializer, UserEnrolledUnitSerializer


class UnitViewSet(viewsets.ModelViewSet):
    """Catalog of study units. Anyone can browse; auth users can enrol and
    create their own custom units."""

    serializer_class = UnitSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Unit.objects.all()
        track = self.request.query_params.get('track')
        if track:
            qs = qs.filter(track=track)
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(syllabus_summary__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        # User-created units are unofficial and owned by the creator.
        serializer.save(created_by=self.request.user, is_official=False)

    def perform_destroy(self, instance):
        # Only allow deleting your own custom units (or admins).
        user = self.request.user
        if instance.is_official and getattr(user, 'tier', '') != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Official units cannot be deleted.')
        if instance.created_by_id and instance.created_by_id != user.id \
                and getattr(user, 'tier', '') != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete units you created.')
        instance.delete()

    @action(detail=False, methods=['get'], url_path='enrolled',
            permission_classes=[permissions.IsAuthenticated])
    def enrolled(self, request):
        """Units the current user is enrolled in."""
        enrollments = (
            UserEnrolledUnit.objects
            .filter(user=request.user)
            .select_related('unit')
        )
        serializer = UserEnrolledUnitSerializer(
            enrollments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='enrol',
            permission_classes=[permissions.IsAuthenticated])
    def enrol(self, request, pk=None):
        """Enrol the current user in this unit."""
        unit = self.get_object()
        UserEnrolledUnit.objects.get_or_create(user=request.user, unit=unit)
        serializer = self.get_serializer(unit)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='unenrol',
            permission_classes=[permissions.IsAuthenticated])
    def unenrol(self, request, pk=None):
        """Remove the current user's enrolment in this unit."""
        unit = self.get_object()
        UserEnrolledUnit.objects.filter(user=request.user, unit=unit).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
