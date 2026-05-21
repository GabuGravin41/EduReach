import re
import threading

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import Unit, UserEnrolledUnit, PaperExtractionJob
from .serializers import (
    UnitSerializer, UserEnrolledUnitSerializer, PaperExtractionJobSerializer,
    UnitLessonSerializer,
)


def _extract_video_id(url: str) -> str:
    """Pull the 11-char YouTube video id from any common URL form."""
    m = re.search(r'(?:v=|youtu\.be/|embed/|shorts/|/v/)([A-Za-z0-9_-]{11})', url or '')
    if m:
        return m.group(1)
    bare = (url or '').strip()
    return bare if re.fullmatch(r'[A-Za-z0-9_-]{11}', bare) else ''


class UnitViewSet(viewsets.ModelViewSet):
    """Catalog of study units. Anyone can browse; auth users can enrol and
    create their own custom units."""

    serializer_class = UnitSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        # Public reads; everything else (enrol, attach-assessment, add-lesson,
        # extract-paper, …) requires auth.
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

    @action(detail=True, methods=['post'], url_path='attach-assessment',
            permission_classes=[permissions.IsAuthenticated])
    def attach_assessment(self, request, pk=None):
        """Tag an existing public assessment to this unit."""
        unit = self.get_object()
        from assessments.models import Assessment
        from assessments.serializers import AssessmentListSerializer

        assessment_id = request.data.get('assessment_id')
        try:
            assessment = Assessment.objects.get(pk=assessment_id, is_public=True)
        except (Assessment.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Assessment not found or not public.'},
                            status=status.HTTP_404_NOT_FOUND)
        assessment.unit = unit
        assessment.save(update_fields=['unit', 'updated_at'])
        return Response(AssessmentListSerializer(assessment, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='detach-assessment',
            permission_classes=[permissions.IsAuthenticated])
    def detach_assessment(self, request, pk=None):
        """Remove an assessment's tag to this unit."""
        unit = self.get_object()
        from assessments.models import Assessment
        assessment_id = request.data.get('assessment_id')
        Assessment.objects.filter(pk=assessment_id, unit=unit).update(unit=None)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='lessons',
            permission_classes=[permissions.AllowAny])
    def lessons(self, request, pk=None):
        """Video lessons belonging to this unit (ordered)."""
        unit = self.get_object()
        lessons = unit.lessons.all().order_by('order', 'id')
        serializer = UnitLessonSerializer(
            lessons, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-lesson',
            permission_classes=[permissions.IsAuthenticated])
    def add_lesson(self, request, pk=None):
        """Add a YouTube video lesson to this unit."""
        unit = self.get_object()
        from courses.models import Lesson

        title = (request.data.get('title') or '').strip()
        video_url = (request.data.get('video_url') or '').strip()
        video_id = _extract_video_id(video_url)
        if not title:
            return Response({'error': 'A lesson title is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not video_id:
            return Response({'error': 'Could not read a YouTube video from that link.'},
                            status=status.HTTP_400_BAD_REQUEST)

        next_order = (unit.lessons.count())
        lesson = Lesson.objects.create(
            unit=unit,
            course=unit.source_course,  # keep legacy link when the unit came from a course
            added_by=request.user,
            title=title,
            video_id=video_id,
            video_url=f'https://www.youtube.com/watch?v={video_id}',
            description=(request.data.get('description') or '').strip(),
            order=next_order,
        )
        serializer = UnitLessonSerializer(lesson, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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


class UnitLessonViewSet(viewsets.ModelViewSet):
    """Edit, delete, or toggle completion of a unit's video lesson."""
    serializer_class = UnitLessonSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['patch', 'delete', 'post', 'head', 'options']

    def get_queryset(self):
        from courses.models import Lesson
        return Lesson.objects.filter(unit__isnull=False)

    def _can_manage(self, lesson, user) -> bool:
        return bool(
            getattr(user, 'is_staff', False)
            or getattr(user, 'tier', '') == 'admin'
            or lesson.added_by_id == user.id
            or (lesson.unit and lesson.unit.created_by_id == user.id)
        )

    def partial_update(self, request, *args, **kwargs):
        lesson = self.get_object()
        if not self._can_manage(lesson, request.user):
            raise PermissionDenied('You can only edit lessons you added.')
        for field in ('title', 'description', 'order'):
            if field in request.data:
                setattr(lesson, field, request.data[field])
        if 'video_url' in request.data:
            vid = _extract_video_id(request.data['video_url'])
            if vid:
                lesson.video_id = vid
                lesson.video_url = f'https://www.youtube.com/watch?v={vid}'
        lesson.save()
        return Response(UnitLessonSerializer(lesson, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        lesson = self.get_object()
        if not self._can_manage(lesson, request.user):
            raise PermissionDenied('You can only delete lessons you added.')
        lesson.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Toggle completion of this lesson for the current user."""
        lesson = self.get_object()
        if lesson.completed_by.filter(pk=request.user.pk).exists():
            lesson.completed_by.remove(request.user)
            completed = False
        else:
            lesson.completed_by.add(request.user)
            completed = True
        return Response({'is_completed': completed})
