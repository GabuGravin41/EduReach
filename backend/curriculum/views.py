import threading

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import Unit, UserEnrolledUnit, PaperExtractionJob
from .serializers import (
    UnitSerializer, UserEnrolledUnitSerializer, PaperExtractionJobSerializer,
)


class UnitViewSet(viewsets.ModelViewSet):
    """Catalog of study units. Anyone can browse; auth users can enrol and
    create their own custom units."""

    serializer_class = UnitSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'papers', 'lessons'):
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

    @action(detail=True, methods=['get'], url_path='papers',
            permission_classes=[permissions.AllowAny])
    def papers(self, request, pk=None):
        """Past papers for this unit. Papers a user explicitly attached to the
        unit come first; topic-keyword matches follow as suggestions."""
        unit = self.get_object()
        from django.db.models import Q
        from assessments.models import Assessment
        from assessments.serializers import AssessmentListSerializer

        attached = list(
            Assessment.objects
            .filter(unit=unit, is_public=True)
            .order_by('-created_at')
        )

        keywords = [k for k in (unit.topic_keywords or []) if k]
        suggested = []
        if keywords:
            topic_q = Q()
            for kw in keywords:
                topic_q |= Q(topic__iexact=kw)
            suggested = list(
                Assessment.objects
                .filter(topic_q, is_public=True)
                .exclude(unit=unit)
                .order_by('-created_at')
            )

        serializer = AssessmentListSerializer(
            attached + suggested, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='lessons',
            permission_classes=[permissions.AllowAny])
    def lessons(self, request, pk=None):
        """Video lessons belonging to this unit (ordered)."""
        unit = self.get_object()
        from courses.serializers import LessonSerializer
        lessons = unit.lessons.all().order_by('order', 'id')
        serializer = LessonSerializer(
            lessons, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='extract-paper',
            permission_classes=[permissions.IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def extract_paper(self, request, pk=None):
        """Upload a PDF past paper. Starts a background extraction job and
        returns it immediately — the client polls the job for status."""
        unit = self.get_object()
        pdf = request.FILES.get('pdf')
        if not pdf:
            return Response({'error': 'No PDF file provided.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not pdf.name.lower().endswith('.pdf'):
            return Response({'error': 'Please upload a PDF file.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if pdf.size > 25 * 1024 * 1024:
            return Response({'error': 'PDF is too large (max 25 MB).'},
                            status=status.HTTP_400_BAD_REQUEST)

        job = PaperExtractionJob.objects.create(
            user=request.user,
            unit=unit,
            title=(request.data.get('title') or '').strip(),
            pdf=pdf,
        )
        # Run extraction off the request thread; the client polls the job.
        from .extraction import run_extraction_job
        threading.Thread(
            target=run_extraction_job, args=(job.id,), daemon=True,
        ).start()
        return Response(PaperExtractionJobSerializer(job).data,
                        status=status.HTTP_202_ACCEPTED)


class PaperExtractionJobViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only — the client polls a job here for extraction status."""
    serializer_class = PaperExtractionJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaperExtractionJob.objects.filter(user=self.request.user)
