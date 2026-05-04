from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import models
from django.db import IntegrityError
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from datetime import timedelta
from django.shortcuts import get_object_or_404
import re
import logging
from ai_service.views import call_ai, safe_json_loads

logger = logging.getLogger(__name__)
from .models import (
    Course,
    Lesson,
    UserProgress,
    CoursePricing,
    ContentPurchase,
    CreatorTip,
)
from .serializers import (
    CourseSerializer,
    CourseListSerializer,
    LessonSerializer,
    UserProgressSerializer,
    CoursePricingSerializer,
    ContentPurchaseSerializer,
    CreatorTipSerializer,
)
from .permissions import IsOwnerOrReadOnly
from services.youtube_service import YouTubeTranscriptService
from payments.models import Payment


class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing courses."""
    PERSONAL_COURSE_TITLE = "Personal Sessions"
    queryset = Course.objects.filter(is_public=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_queryset(self):
        """Filter courses based on user permissions."""
        user = self.request.user
        if user.is_authenticated:
            if user.is_superuser or getattr(user, 'tier', '') == 'admin':
                return Course.objects.all().select_related('owner').prefetch_related('lessons')
            return Course.objects.filter(
                models.Q(is_public=True) | models.Q(owner=user)
            ).select_related('owner').prefetch_related('lessons')
        return Course.objects.filter(is_public=True).select_related('owner').prefetch_related('lessons')

    def perform_create(self, serializer):
        """Set the owner to the current user."""
        from rest_framework.exceptions import PermissionDenied

        try:
            usage = self.request.user.get_current_usage()
            if not usage.can_create_course():
                limits = usage.get_tier_limits()
                raise PermissionDenied(
                    f'Monthly course limit reached ({limits["courses"]}). Upgrade your plan to create more courses.'
                )
        except PermissionDenied:
            raise
        except Exception:
            # If usage tracking fails, do not block course creation.
            pass

        requested_title = serializer.validated_data.get('title', 'Untitled Course').strip()
        unique_title = self._build_unique_title_for_owner(self.request.user, requested_title)
        
        try:
            serializer.save(owner=self.request.user, title=unique_title)
        except IntegrityError:
            # Final fallback title if collision still happens (rare)
            final_title = f"{unique_title} - {timezone.now().strftime('%Y%m%d%H%M')}"
            serializer.save(owner=self.request.user, title=final_title)
        try:
            usage = self.request.user.get_current_usage()
            usage.courses_created += 1
            usage.save(update_fields=['courses_created', 'updated_at'])
        except Exception:
            pass

    def perform_update(self, serializer):
        requested_title = serializer.validated_data.get('title')
        if requested_title is not None:
            serializer.validated_data['title'] = self._build_unique_title_for_owner(
                self.request.user,
                requested_title,
                exclude_course_id=serializer.instance.id,
            )
        try:
            serializer.save()
        except IntegrityError:
            if requested_title is None:
                raise ValidationError({
                    'detail': ['Could not save course updates. Please try again.']
                })
            fallback_title = self._build_unique_title_for_owner(
                self.request.user,
                serializer.validated_data.get('title', requested_title),
                exclude_course_id=serializer.instance.id,
            )
            serializer.save(title=fallback_title)

    @action(detail=True, methods=['get'])
    def lessons(self, request, pk=None):
        """Get all lessons for a course."""
        course = self.get_object()
        lessons = course.lessons.all()
        serializer = LessonSerializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        """Get courses owned by or enrolled in by the current user."""
        enrolled_course_ids = UserProgress.objects.filter(
            user=request.user
        ).values_list('course_id', flat=True)
        courses = Course.objects.filter(
            models.Q(owner=request.user) | models.Q(id__in=enrolled_course_ids)
        ).distinct().select_related('owner').prefetch_related('lessons')
        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return Response(serializer.data)

    def _extract_video_id(self, video_id: str = None, video_url: str = None):
        """Extract YouTube video ID from ID or URL."""
        if video_id:
            return video_id.strip()
        if not video_url:
            return None
        match = re.search(
            r'(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([^&?/]+)',
            video_url
        )
        return match.group(1) if match else None

    def _split_title_suffix(self, title: str):
        match = re.match(r'^(.*?)(?:\s\((\d+)\))?$', (title or '').strip())
        if not match:
            return (title or '').strip(), None
        base = (match.group(1) or '').strip()
        suffix = match.group(2)
        return base, int(suffix) if suffix else None

    def _build_unique_title_for_owner(self, owner, requested_title: str, exclude_course_id: int = None) -> str:
        requested = (requested_title or '').strip()
        if not requested:
            return requested

        queryset = Course.objects.filter(owner=owner)
        if exclude_course_id:
            queryset = queryset.exclude(id=exclude_course_id)
        existing_titles = list(queryset.values_list('title', flat=True))

        has_exact_collision = any((title or '').strip().casefold() == requested.casefold() for title in existing_titles)
        if not has_exact_collision:
            return requested

        base, _ = self._split_title_suffix(requested)
        base = base or requested

        used_numbers = set()
        for title in existing_titles:
            existing_base, existing_suffix = self._split_title_suffix(title or '')
            if existing_base.casefold() == base.casefold():
                used_numbers.add(existing_suffix if existing_suffix is not None else 1)

        suffix = 2
        while suffix in used_numbers:
            suffix += 1
        return f'{base} ({suffix})'

    def _get_pricing(self, course: Course) -> CoursePricing:
        pricing, _ = CoursePricing.objects.get_or_create(course=course)
        return pricing

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def ensure_personal(self, request):
        """
        Ensure the user has a default private course for standalone sessions.
        Returns the course (created if necessary).
        """
        course, created = Course.objects.get_or_create(
            owner=request.user,
            is_public=False,
            title=self.PERSONAL_COURSE_TITLE,
            defaults={
                'description': 'Auto-created course for personal learning sessions.',
            }
        )
        serializer = CourseSerializer(course, context={'request': request})
        return Response({
            'course': serializer.data,
            'created': created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def pricing(self, request, pk=None):
        course = self.get_object()
        pricing = self._get_pricing(course)

        if request.method == 'PATCH':
            if course.owner != request.user:
                return Response(
                    {'detail': "Only the course owner can update pricing."},
                    status=status.HTTP_403_FORBIDDEN
                )
            serializer = CoursePricingSerializer(pricing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = CoursePricingSerializer(pricing)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def purchase(self, request, pk=None):
        course = self.get_object()
        if course.owner == request.user:
            return Response({'detail': "You already own this course."}, status=status.HTTP_400_BAD_REQUEST)

        pricing = self._get_pricing(course)
        if not pricing.is_paid or pricing.price <= 0:
            return Response({'detail': "Course is not paid; no purchase needed."}, status=status.HTTP_400_BAD_REQUEST)

        payment_id = request.data.get('payment_id')
        if not payment_id:
            return Response({'detail': 'payment_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.COMPLETED:
            return Response({'detail': 'Payment must be completed before unlocking content.'}, status=status.HTTP_400_BAD_REQUEST)

        purchase, created = ContentPurchase.objects.get_or_create(
            user=request.user,
            course=course,
            defaults={
                'amount': pricing.price,
                'currency': pricing.currency,
                'payment': payment,
            }
        )

        if not created:
            return Response({'detail': 'Course already unlocked.'}, status=status.HTTP_200_OK)

        serializer = ContentPurchaseSerializer(purchase)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def tip(self, request, pk=None):
        course = self.get_object()
        pricing = self._get_pricing(course)
        if not pricing.allow_tips:
            return Response({'detail': 'Tips are disabled for this course.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = request.data.get('amount')
        payment_id = request.data.get('payment_id')
        message = request.data.get('message', '')

        if not amount or not payment_id:
            return Response({'detail': 'amount and payment_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_value = Decimal(str(amount))
            if amount_value <= 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.COMPLETED:
            return Response({'detail': 'Payment must be completed to send a tip.'}, status=status.HTTP_400_BAD_REQUEST)

        tip = CreatorTip.objects.create(
            from_user=request.user,
            to_creator=course.owner,
            course=course,
            amount=amount_value,
            currency=payment.currency,
            message=message[:280],
            payment=payment,
        )

        serializer = CreatorTipSerializer(tip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def creator_dashboard(self, request):
        courses = Course.objects.filter(owner=request.user)
        course_ids = courses.values_list('id', flat=True)
        purchases = ContentPurchase.objects.filter(course_id__in=course_ids)
        tips = CreatorTip.objects.filter(to_creator=request.user)

        total_revenue = purchases.aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        total_tips = tips.aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        thirty_days_ago = timezone.now() - timedelta(days=30)
        revenue_30 = purchases.filter(created_at__gte=thirty_days_ago).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        tips_30 = tips.filter(created_at__gte=thirty_days_ago).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        data = {
            'total_courses': courses.count(),
            'paid_courses': courses.filter(pricing__is_paid=True).count(),
            'total_revenue': total_revenue + total_tips,
            'revenue_from_sales': total_revenue,
            'revenue_from_tips': total_tips,
            'revenue_last_30_days': revenue_30 + tips_30,
            'recent_purchases': ContentPurchaseSerializer(purchases[:5], many=True).data,
            'recent_tips': CreatorTipSerializer(tips[:5], many=True).data,
        }
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_lesson(self, request, pk=None):
        """
        Add a lesson to a course owned by the current user.
        Expected payload:
        {
            "title": "",
            "video_id": "",
            "video_url": "",
            "duration": "",
            "description": "",
            "transcript": "",
            "transcript_language": "en",
            "manual_transcript": ""
        }
        """
        course = self.get_object()

        if course.owner != request.user:
            return Response(
                {'error': "You don't have permission to modify this course."},
                status=status.HTTP_403_FORBIDDEN
            )

        title = (request.data.get('title') or '').strip()
        video_id = self._extract_video_id(
            request.data.get('video_id'),
            request.data.get('video_url')
        )

        if not video_id:
            return Response(
                {'error': 'Video identifier/url is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        duration = request.data.get('duration', 'N/A')
        description = request.data.get('description', '')
        transcript = request.data.get('transcript', '')
        transcript_language = request.data.get('transcript_language', 'en')
        manual_transcript = request.data.get('manual_transcript', '')
        auto_fetch_raw = request.data.get('auto_fetch_transcript', True)
        if isinstance(auto_fetch_raw, str):
            auto_fetch_transcript = auto_fetch_raw.strip().lower() in ('1', 'true', 'yes', 'on')
        else:
            auto_fetch_transcript = bool(auto_fetch_raw)

        # Avoid unique(order) collisions when lessons were deleted/reordered.
        existing_lesson = course.lessons.order_by('-order').first()
        next_order = (existing_lesson.order + 1) if existing_lesson else 0

        video_url = request.data.get('video_url') or f'https://www.youtube.com/watch?v={video_id}'

        metadata = {}

        fetch_status = 'not_attempted'
        # If transcript is not provided manually, try auto-fetching from YouTube.
        if not transcript and auto_fetch_transcript:
            try:
                service = YouTubeTranscriptService()
                result = service.extract_complete_video_data(video_url, transcript_language)
                if result.get('success'):
                    transcript_data = result.get('transcript', {})
                    transcript = transcript_data.get('transcript', '') or transcript
                    fetch_status = 'success'

                    metadata = result.get('metadata', {})
                    if duration == 'N/A' and metadata.get('duration'):
                        duration = str(metadata.get('duration'))
                else:
                    fetch_status = 'failed'
                    logger.warning("Auto-transcript fetch failed for %s: %s", video_url, result.get('error'))
            except Exception as e:
                fetch_status = 'error'
                logger.error("Transcript pull exception for %s: %s", video_url, e)
                pass
        elif transcript:
            fetch_status = 'provided'

        if not title:
            title = metadata.get('title') or f'Lesson {next_order + 1}'

        lesson = Lesson.objects.create(
            course=course,
            title=title,
            video_id=video_id,
            video_url=video_url,
            duration=duration,
            order=next_order,
            description=description,
            transcript=transcript,
            transcript_language=transcript_language,
            manual_transcript=manual_transcript
        )

        # If transcript still missing, do a second synchronous attempt directly
        if not lesson.transcript and auto_fetch_transcript:
            try:
                service2 = YouTubeTranscriptService()
                result2 = service2.extract_transcript(lesson.video_id, transcript_language)
                if result2.get('success'):
                    lesson.transcript = result2.get('timestamped_transcript') or result2.get('transcript')
                    from django.utils import timezone as tz
                    lesson.transcript_fetched_at = tz.now()
                    lesson.save()
                    fetch_status = 'success'
                else:
                    fetch_status = 'failed'
            except Exception as e:
                logger.error("Second transcript attempt failed for %s: %s", video_url, e)
                fetch_status = 'failed'

        if not lesson.transcript and not lesson.manual_transcript and lesson.video_id:
            from .signals import notify_admin_missing_transcript
            notify_admin_missing_transcript(lesson)

        serializer = LessonSerializer(lesson)
        data = serializer.data
        data['transcript_fetch_status'] = fetch_status
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def search_youtube(self, request):
        """
        Search YouTube and return a list of video metadata cards.

        GET /api/courses/search_youtube/?q=calculus+derivatives&limit=8

        ── CURRENT IMPLEMENTATION: Option B — yt-dlp scraping ──────────────────
        No API key required. Uses yt-dlp's ytsearch to scrape YouTube results.
        May be slow (3–6 s) and could be blocked by YouTube on datacenter IPs.

        ── TODO: Switch to Option A — YouTube Data API v3 ──────────────────────
        When YOUTUBE_API_KEY is available in .env, replace the yt-dlp block below
        with this (install: pip install google-api-python-client):

            from googleapiclient.discovery import build
            from django.conf import settings as _s

            yt = build('youtube', 'v3', developerKey=_s.YOUTUBE_API_KEY,
                       cache_discovery=False)
            resp = yt.search().list(
                q=query, part='snippet', maxResults=limit,
                type='video', relevanceLanguage='en',
            ).execute()

            results = [
                {
                    'video_id':      item['id']['videoId'],
                    'title':         item['snippet']['title'],
                    'channel':       item['snippet']['channelTitle'],
                    'duration':      '',   # needs a videos().list() call to get duration
                    'thumbnail_url': item['snippet']['thumbnails']['medium']['url'],
                    'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                }
                for item in resp.get('items', [])
            ]

        Benefits of Option A: faster (~300 ms), richer metadata, official quota,
        not affected by IP blocks on the video-download path.
        Cost: 100 quota units per search; free tier = ~100 searches/day.
        ──────────────────────────────────────────────────────────────────────────
        """
        query = request.query_params.get('q', '').strip()
        try:
            limit = min(int(request.query_params.get('limit', 8)), 20)
        except (ValueError, TypeError):
            limit = 8

        if not query:
            return Response({'results': [], 'method': 'none'})

        # ── Option B: yt-dlp ──────────────────────────────────────────────────
        # Remove/replace this block when switching to Option A above.
        try:
            import yt_dlp as _ytdlp
            import os as _os

            deno_bin = _os.path.expanduser('~/.deno/bin')
            env_path = _os.environ.get('PATH', '')
            if deno_bin not in env_path:
                _os.environ['PATH'] = deno_bin + ':' + env_path

            cookies_path = _os.environ.get('YOUTUBE_COOKIES_FILE', '').strip()

            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,  # metadata only — no format resolution needed
            }
            if cookies_path and _os.path.isfile(cookies_path):
                ydl_opts['cookiefile'] = cookies_path

            with _ytdlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f'ytsearch{limit}:{query}', download=False)

            entries = (info or {}).get('entries', [])
            results = []
            for entry in entries:
                vid = entry.get('id')
                if not vid:
                    continue
                raw_dur = entry.get('duration')
                if raw_dur:
                    m, s = divmod(int(raw_dur), 60)
                    h, m = divmod(m, 60)
                    duration = f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'
                else:
                    duration = entry.get('duration_string', '')
                results.append({
                    'video_id':      vid,
                    'title':         entry.get('title', 'Untitled'),
                    'channel':       (entry.get('uploader') or entry.get('channel')
                                      or entry.get('channel_id', '')),
                    'duration':      duration,
                    'thumbnail_url': f'https://img.youtube.com/vi/{vid}/mqdefault.jpg',
                    'url':           f'https://www.youtube.com/watch?v={vid}',
                })

            return Response({'results': results, 'method': 'yt_dlp', 'query': query})

        except Exception as exc:
            logger.warning('YouTube search (yt-dlp) failed for query "%s": %s', query, exc)
            return Response(
                {'results': [], 'error': 'Search unavailable right now. Paste a URL instead.',
                 'method': 'yt_dlp'},
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start_session(self, request):
        """
        Create a lesson for an ad-hoc learning session.
        If no courseId provided, creates/uses user's 'Personal Sessions' course.
        
        POST /api/courses/start_session/
        {
            "title": "Session title",
            "video_id": "YouTubeID",
            "video_url": "https://...",
            "transcript": "Transcript text or JSON",
            "transcript_language": "en" (optional),
            "course_id": 123 (optional, defaults to personal course)
        }
        """
        try:
            title = request.data.get('title', 'Learning Session')
            video_id = self._extract_video_id(
                request.data.get('video_id'),
                request.data.get('video_url')
            )
            
            if not video_id:
                return Response(
                    {'error': 'Video ID or URL is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Determine course: use provided or create/get personal course
            course_id = request.data.get('course_id')
            if course_id:
                try:
                    course = Course.objects.get(id=course_id, owner=request.user)
                except Course.DoesNotExist:
                    return Response(
                        {'error': 'Course not found or you do not own it'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Ensure personal course exists
                course, _ = Course.objects.get_or_create(
                    owner=request.user,
                    is_public=False,
                    title=self.PERSONAL_COURSE_TITLE,
                    defaults={
                        'description': 'Auto-created course for personal learning sessions.',
                    }
                )
            
            # Create lesson in the course
            transcript = request.data.get('transcript', '')
            transcript_language = request.data.get('transcript_language', 'en')
            duration = request.data.get('duration', 'N/A')
            description = request.data.get('description', '')
            
            # Build video_url - ensure it's always a valid URL
            video_url = request.data.get('video_url')
            if not video_url:
                video_url = f'https://www.youtube.com/watch?v={video_id}'
            
            # Get the next order value: max existing order + 1
            existing_lesson = course.lessons.order_by('-order').first()
            next_order = (existing_lesson.order + 1) if existing_lesson else 0
            
            lesson = Lesson.objects.create(
                course=course,
                title=title,
                video_id=video_id,
                video_url=video_url,
                duration=duration,
                order=next_order,
                description=description,
                transcript=transcript,
                transcript_language=transcript_language
            )
            
            # Fetch transcript synchronously if not provided
            if not lesson.transcript:
                try:
                    svc = YouTubeTranscriptService()
                    tres = svc.extract_transcript(lesson.video_id, transcript_language)
                    if tres.get('success'):
                        lesson.transcript = tres.get('timestamped_transcript') or tres.get('transcript')
                        from django.utils import timezone as tz
                        lesson.transcript_fetched_at = tz.now()
                        lesson.save()
                except Exception as e:
                    logger.error("Session transcript fetch failed for %s: %s", video_url, e)
            
            serializer = LessonSerializer(lesson)
            return Response(
                {
                    'success': True,
                    'lesson': serializer.data,
                    'course': CourseSerializer(course, context={'request': request}).data,
                    'message': f'Session saved to course "{course.title}"'
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in start_session: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to create session: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LessonViewSet(viewsets.ModelViewSet):
    """ViewSet for managing lessons."""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """Ensure the user owns the course before adding a lesson."""
        course = serializer.validated_data['course']
        if course.owner != self.request.user:
            raise permissions.PermissionDenied(
                "You don't have permission to add lessons to this course."
            )
        lesson = serializer.save()
        if lesson and not lesson.transcript and not lesson.manual_transcript and lesson.video_id:
            from .signals import notify_admin_missing_transcript
            notify_admin_missing_transcript(lesson)
    
    def perform_update(self, serializer):
        """Ensure the user owns the course before updating a lesson."""
        lesson = self.get_object()
        if lesson.course.owner != self.request.user:
            raise permissions.PermissionDenied(
                "You don't have permission to edit lessons in this course."
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """Ensure the user owns the course before deleting a lesson."""
        if instance.course.owner != self.request.user:
            raise permissions.PermissionDenied(
                "You don't have permission to delete lessons from this course."
            )
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def fetch_transcript(self, request, pk=None):
        """
        Fetch transcript from YouTube for this lesson.
        Falls back to manual transcript if auto-fetch fails.
        
        POST /api/lessons/{id}/fetch_transcript/
        {
            "language": "en" (optional),
            "force_refresh": false (optional)
        }
        """
        lesson = self.get_object()
        language = request.data.get('language', 'en')
        force_refresh = request.data.get('force_refresh', False)
        
        # Check if transcript already exists and not forcing refresh
        if lesson.transcript and not force_refresh:
            return Response({
                'success': True,
                'message': 'Transcript already exists',
                'transcript': lesson.transcript,
                'source': 'cached',
                'has_manual_fallback': bool(lesson.manual_transcript)
            })
        
        # Fetch synchronously so the caller gets the result immediately
        try:
            from django.utils import timezone as tz
            service = YouTubeTranscriptService()
            result = service.extract_transcript(lesson.video_id, language or lesson.transcript_language or 'en')
            if result.get('success'):
                lesson.transcript = result.get('timestamped_transcript') or result.get('transcript')
                lesson.transcript_fetched_at = tz.now()
                lesson.save()
                return Response({
                    'success': True,
                    'transcript': lesson.transcript,
                    'method': result.get('method'),
                    'used_cookies': result.get('used_cookies', False),
                    'source': 'fetched'
                })
            else:
                return Response({
                    'success': False,
                    'error': result.get('error', 'Could not fetch transcript'),
                    'fallbacks': result.get('fallbacks', []),
                    'has_manual_fallback': bool(lesson.manual_transcript)
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error("fetch_transcript error for lesson %s: %s", lesson.id, e)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def update_manual_transcript(self, request, pk=None):
        """
        Update the manual transcript for a lesson.
        
        POST /api/lessons/{id}/update_manual_transcript/
        {
            "manual_transcript": "Transcript text here..."
        }
        """
        lesson = self.get_object()
        
        # Check if user owns the course
        if lesson.course.owner != request.user:
            return Response({
                'error': "You don't have permission to update this lesson"
            }, status=status.HTTP_403_FORBIDDEN)
        
        manual_transcript = request.data.get('manual_transcript', '')
        
        if not manual_transcript:
            return Response({
                'error': 'manual_transcript field is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        lesson.manual_transcript = manual_transcript
        lesson.save()
        
        return Response({
            'success': True,
            'message': 'Manual transcript updated successfully',
            'manual_transcript': lesson.manual_transcript,
            'has_auto_transcript': bool(lesson.transcript)
        })

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        """
        Mark lesson as complete for the current user and update course progress.
        Any authenticated user can record progress on any lesson — we bypass
        the ViewSet queryset (which is ownership-scoped) and fetch directly.
        """
        try:
            lesson = Lesson.objects.get(pk=pk)
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found.'}, status=status.HTTP_404_NOT_FOUND)
        progress, _ = UserProgress.objects.get_or_create(
            user=request.user,
            course=lesson.course
        )
        progress.completed_lessons.add(lesson)
        progress.update_progress()
        return Response({
            'success': True,
            'course_id': lesson.course_id,
            'lesson_id': lesson.id,
            'progress_percentage': progress.progress_percentage,
            'completed_lesson_ids': list(progress.completed_lessons.values_list('id', flat=True)),
        })

    @action(detail=True, methods=['post'])
    def unmark_complete(self, request, pk=None):
        """
        Unmark lesson as complete for the current user and update course progress.
        Same direct-fetch approach as mark_complete.
        """
        try:
            lesson = Lesson.objects.get(pk=pk)
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found.'}, status=status.HTTP_404_NOT_FOUND)
        progress, _ = UserProgress.objects.get_or_create(
            user=request.user,
            course=lesson.course
        )
        progress.completed_lessons.remove(lesson)
        progress.update_progress()
        return Response({
            'success': True,
            'course_id': lesson.course_id,
            'lesson_id': lesson.id,
            'progress_percentage': progress.progress_percentage,
            'completed_lesson_ids': list(progress.completed_lessons.values_list('id', flat=True)),
        })
    
    @action(detail=True, methods=['post'])
    def generate_quiz(self, request, pk=None):
        """
        Generate quiz questions from lesson transcript.
        
        POST /api/lessons/{id}/generate_quiz/
        {
            "num_questions": 5 (optional),
            "difficulty": "medium" (optional)
        }
        """
        lesson = self.get_object()
        
        # Get transcript (auto or manual)
        transcript = lesson.get_transcript()
        
        if not transcript:
            return Response({
                'error': 'No transcript available for this lesson. Please fetch or add a transcript first.',
                'can_fetch': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get quiz parameters
        num_questions = request.data.get('num_questions', 5)
        difficulty = request.data.get('difficulty', 'medium')
        
        # Call AI service to generate quiz using unified provider
        try:
            prompt = f"""
            Based on the following video transcript, generate {num_questions} {difficulty} difficulty quiz questions.

            Transcript:
            {transcript[:4000]}

            Return ONLY valid JSON. Use LaTeX ($...$ for inline, $$...$$ for block math) for any formulas:
            {{
                "questions": [
                    {{
                        "question": "Question text here?",
                        "type": "mcq",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_answer": "Option A",
                        "explanation": "Brief explanation of why this is correct"
                    }}
                ]
            }}

            Ensure the questions are relevant to the transcript content and test understanding of key concepts.
            IMPORTANT for valid JSON: Inside every JSON string value, escape backslashes by doubling them (e.g. write \\\\mathbb instead of \\mathbb).
            """

            # Use shared AI call helper (handles Gemini vs OpenRouter and rate limits)
            response_text = call_ai(prompt, max_tokens=1500)

            # Robust parse
            quiz_data = safe_json_loads(response_text)
            if not quiz_data:
                raise ValueError("No JSON captured from AI response")

            return Response({
                'success': True,
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'quiz': quiz_data,
                'transcript_source': 'auto' if lesson.transcript else 'manual'
            })

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("generate_quiz: JSON decoding failed: %s", e)
            return Response({
                'success': False,
                'error': 'AI output was not in valid JSON format. Try again or provide a better transcript.',
                'raw_response': response_text if 'response_text' in locals() else None
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception as e:
            logger.error("generate_quiz: unexpected error: %s", e, exc_info=True)
            return Response({
                'success': False,
                'error': f'Error generating quiz: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def save_quiz_as_assessment(self, request, pk=None):
        """
        Save generated quiz as an assessment linked to this lesson.
        
        POST /api/lessons/{id}/save_quiz_as_assessment/
        {
            "title": "Quiz Title",
            "quiz_data": {...},
            "time_limit_minutes": 30 (optional),
            "is_public": true (optional)
        }
        """
        from assessments.models import Assessment, Question
        
        lesson = self.get_object()
        
        title = request.data.get('title')
        quiz_data = request.data.get('quiz_data')
        time_limit = request.data.get('time_limit_minutes', 30)
        is_public = request.data.get('is_public', True)
        
        if not title or not quiz_data:
            return Response({
                'error': 'Title and quiz_data are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create assessment
            assessment = Assessment.objects.create(
                title=title,
                topic=lesson.title,
                description=f"Quiz generated from: {lesson.title}",
                creator=request.user,
                time_limit_minutes=time_limit,
                is_public=is_public,
                source_lesson=lesson  # Link to source lesson
            )
            
            # Create questions
            questions = quiz_data.get('questions', [])
            for idx, q in enumerate(questions):
                Question.objects.create(
                    assessment=assessment,
                    question_text=q.get('question', ''),
                    question_type=q.get('type', 'mcq'),
                    options=q.get('options', []),
                    correct_answer=q.get('correct_answer', ''),
                    explanation=q.get('explanation', ''),
                    points=1,
                    order=idx
                )
            
            return Response({
                'success': True,
                'message': 'Quiz saved as assessment',
                'assessment_id': assessment.id,
                'assessment_title': assessment.title,
                'questions_count': len(questions)
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error saving quiz: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def get_transcript(self, request, pk=None):
        """
        Get the transcript for a lesson (auto or manual).
        
        GET /api/lessons/{id}/get_transcript/
        """
        lesson = self.get_object()
        
        transcript = lesson.get_transcript()
        
        if not transcript:
            return Response({
                'success': False,
                'message': 'No transcript available',
                'can_fetch': True,
                'can_paste_manual': True
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'success': True,
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'transcript': transcript,
            'source': 'auto' if lesson.transcript else 'manual',
            'language': lesson.transcript_language,
            'fetched_at': lesson.transcript_fetched_at
        })
    
    @action(detail=True, methods=['post'])
    def save_notes(self, request, pk=None):
        """
        Save user notes for this lesson.
        
        POST /api/lessons/{id}/save_notes/
        {
            "notes": "My notes here",
            "timestamps": [{"time": 120, "note": "Key point"}]
        }
        """
        from assessments.models import VideoNotes
        
        lesson = self.get_object()
        notes_text = request.data.get('notes', '')
        timestamps = request.data.get('timestamps', [])
        
        video_notes, created = VideoNotes.objects.update_or_create(
            user=request.user,
            video_id=lesson.video_id,
            defaults={
                'notes': notes_text,
                'timestamps': timestamps
            }
        )
        
        return Response({
            'success': True,
            'message': 'Notes saved successfully',
            'notes_id': video_notes.id,
            'created': created
        })
    
    @action(detail=True, methods=['get'])
    def get_notes(self, request, pk=None):
        """
        Get user notes for this lesson.
        
        GET /api/lessons/{id}/get_notes/
        """
        from assessments.models import VideoNotes
        
        lesson = self.get_object()
        
        try:
            notes = VideoNotes.objects.get(user=request.user, video_id=lesson.video_id)
            return Response({
                'success': True,
                'notes': {
                    'id': notes.id,
                    'notes': notes.notes,
                    'timestamps': notes.timestamps,
                    'created_at': notes.created_at,
                    'updated_at': notes.updated_at
                }
            })
        except VideoNotes.DoesNotExist:
            return Response({
                'success': True,
                'notes': None,
                'message': 'No notes yet for this lesson'
            })
    
    @action(detail=True, methods=['post'])
    def ai_tutor(self, request, pk=None):
        """
        AI tutor that has access to lesson transcript and user notes.
        
        POST /api/lessons/{id}/ai_tutor/
        {
            "message": "Can you explain variables in more detail?"
        }
        """
        from assessments.models import VideoNotes
        
        lesson = self.get_object()
        user_message = request.data.get('message', '')
        
        if not user_message:
            return Response({
                'error': 'Message is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get transcript
        transcript = lesson.get_transcript()
        
        # Get user notes if they exist
        user_notes = ''
        try:
            notes = VideoNotes.objects.get(user=request.user, video_id=lesson.video_id)
            user_notes = notes.notes
        except VideoNotes.DoesNotExist:
            pass
        
        # Build context for AI
        context = f"""
You are an AI tutor helping a student understand a video lesson.

Lesson: {lesson.title}
Course: {lesson.course.title}

"""
        
        if transcript:
            context += f"""Video Transcript:
{transcript[:4000]}

"""
        
        if user_notes:
            context += f"""Student's Notes:
{user_notes}

"""
        
        context += f"""Based on the video content and the student's notes above, please answer this question:

Student Question: {user_message}

Provide a clear, educational response that references specific parts of the video when relevant."""
        
        try:
            try:
                usage = request.user.get_current_usage()
                if not usage.can_use_ai():
                    return Response({
                        'success': False,
                        'error': 'Monthly AI limit reached. Upgrade your plan to continue.'
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            except Exception:
                usage = None

            # Reuse unified AI provider call (OpenRouter preferred, Gemini fallback if configured)
            response_text = call_ai(context, max_tokens=500)

            # Track AI usage where available
            if usage is None:
                try:
                    usage = request.user.get_current_usage()
                except Exception:
                    usage = None
            if usage is not None:
                usage.ai_queries_used += 1
                usage.save(update_fields=['ai_queries_used', 'updated_at'])

            return Response({
                'success': True,
                'response': response_text,
                'has_transcript': bool(transcript),
                'has_notes': bool(user_notes)
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': f'AI error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserProgressViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user progress."""
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own progress."""
        return UserProgress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def complete_lesson(self, request, pk=None):
        """Mark a lesson as completed."""
        progress = self.get_object()
        lesson_id = request.data.get('lesson_id')
        
        try:
            lesson = Lesson.objects.get(id=lesson_id, course=progress.course)
            progress.completed_lessons.add(lesson)
            progress.update_progress()
            return Response(UserProgressSerializer(progress).data)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Lesson not found in this course'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def start_course(self, request):
        """Start tracking progress for a course."""
        course_id = request.data.get('course_id')
        course = get_object_or_404(Course, id=course_id)
        
        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        
        return Response(
            UserProgressSerializer(progress).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
