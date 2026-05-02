from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import models, IntegrityError
from django.utils import timezone
from datetime import timedelta
from .models import Assessment, Question, UserAttempt, AssessmentAnswerImage
from .serializers import (
    AssessmentSerializer, AssessmentListSerializer,
    QuestionSerializer, QuestionWithoutAnswerSerializer,
    UserAttemptSerializer, SubmitAnswersSerializer,
    AssessmentAnswerImageSerializer, ManualGradeSerializer
)
from courses.permissions import IsOwnerOrReadOnly
from users.models import User as UserModel, Notification


class AssessmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing assessments."""
    queryset = Assessment.objects.filter(is_public=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return AssessmentListSerializer
        return AssessmentSerializer

    def get_queryset(self):
        """Filter assessments based on user permissions."""
        user = self.request.user
        if user.is_authenticated:
            if user.is_superuser or getattr(user, 'tier', '') == 'admin':
                return Assessment.objects.all().select_related('creator').prefetch_related('questions')
            return Assessment.objects.filter(
                models.Q(is_public=True) | models.Q(creator=user)
            ).select_related('creator').prefetch_related('questions')
        return Assessment.objects.filter(is_public=True).select_related('creator').prefetch_related('questions')

    def perform_create(self, serializer):
        """Set the creator to the current user."""
        from rest_framework.exceptions import PermissionDenied

        try:
            usage = self.request.user.get_current_usage()
            if not usage.can_create_assessment():
                limits = usage.get_tier_limits()
                raise PermissionDenied(
                    f'Monthly assessment limit reached ({limits["assessments"]}). Upgrade your plan to create more.'
                )
        except PermissionDenied:
            raise
        except Exception:
            # If usage tracking fails, do not block assessment creation.
            pass

        # Auto-disambiguate duplicate titles for the same creator.
        # If "Python Quiz" already exists, the new one becomes "Python Quiz (2)", etc.
        base_title = serializer.validated_data.get('title', '')
        if base_title:
            existing_titles = set(
                Assessment.objects.filter(creator=self.request.user, title__startswith=base_title)
                .values_list('title', flat=True)
            )
            if base_title in existing_titles:
                n = 2
                while f'{base_title} ({n})' in existing_titles:
                    n += 1
                serializer.validated_data['title'] = f'{base_title} ({n})'

        try:
            serializer.save(creator=self.request.user)
        except IntegrityError:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'title': 'An assessment with this title already exists. Please choose a different name.'}
            )
        try:
            usage = self.request.user.get_current_usage()
            usage.assessments_created += 1
            usage.save(update_fields=['assessments_created', 'updated_at'])
        except Exception:
            pass

    def retrieve(self, request, *args, **kwargs):
        assessment = self.get_object()
        share_token = request.query_params.get('share_token')
        if (
            assessment.creator != request.user
            and not assessment.is_public
            and share_token != str(assessment.share_token)
        ):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def perform_update(self, serializer):
        assessment = self.get_object()
        if assessment.creator != self.request.user:
            raise PermissionDenied('Only the creator can edit this assessment.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.creator != self.request.user:
            raise PermissionDenied('Only the creator can delete this assessment.')
        instance.delete()

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Get all questions for an assessment."""
        assessment = self.get_object()
        questions = assessment.questions.all()
        
        # Hide correct answers for students taking the assessment
        share_token = request.query_params.get('share_token')
        if request.user != assessment.creator and share_token != str(assessment.share_token):
            serializer = QuestionWithoutAnswerSerializer(questions, many=True)
        else:
            serializer = QuestionSerializer(questions, many=True)
        
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def leaderboard(self, request, pk=None):
        """Leaderboard for a specific assessment."""
        assessment = self.get_object()
        # Top 10 graded attempts by percentage and time
        top_attempts = assessment.attempts.filter(
            status=UserAttempt.Status.GRADED
        ).order_by('-percentage', 'time_taken_seconds')[:10]
        
        serializer = UserAttemptSerializer(top_attempts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create multiple assessments (e.g., for Olympiad prep)."""
        assessments_data = request.data.get('assessments', [])
        if not assessments_data:
            return Response({'error': 'No assessments data provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        created_assessments = []
        user = request.user
        usage = user.get_current_usage()
        
        for data in assessments_data:
            if not usage.can_create_assessment():
                break
                
            serializer = AssessmentSerializer(data=data)
            if serializer.is_valid():
                assessment = serializer.save(creator=user)
                created_assessments.append(serializer.data)
                usage.assessments_created += 1
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        usage.save()
        return Response(created_assessments, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start an attempt at an assessment."""
        assessment = self.get_object()
        
        # Check if user already has an in-progress attempt
        existing_attempt = UserAttempt.objects.filter(
            user=request.user,
            assessment=assessment,
            status=UserAttempt.Status.IN_PROGRESS
        ).first()
        
        if existing_attempt:
            return Response(
                UserAttemptSerializer(existing_attempt).data,
                status=status.HTTP_200_OK
            )
        
        # Create new attempt
        attempt = UserAttempt.objects.create(
            user=request.user,
            assessment=assessment
        )
        
        return Response(
            UserAttemptSerializer(attempt).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit answers for an assessment."""
        assessment = self.get_object()
        serializer = SubmitAnswersSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the user's in-progress attempt
        attempt = get_object_or_404(
            UserAttempt,
            user=request.user,
            assessment=assessment,
            status=UserAttempt.Status.IN_PROGRESS
        )
        
        attempt.answers = serializer.validated_data['answers']

        # Determine if any questions need AI grading (essay or short_answer with model solution).
        # This is true regardless of assessment_type (quiz or exam) — grading mode is determined
        # by question types, not by the quiz/exam distinction.
        needs_ai_grading = attempt._assessment_needs_ai_grading()

        if needs_ai_grading:
            # Save answers and mark as SUBMITTED first so there's a record even if grading fails.
            attempt.status = UserAttempt.Status.SUBMITTED
            if not attempt.submitted_at:
                attempt.submitted_at = timezone.now()
            attempt.save(update_fields=['answers', 'status', 'submitted_at'])

            # Attempt synchronous AI grading within the same request.
            # If it succeeds the status is promoted to GRADED by calculate_score().
            # If it raises (timeout, API error, quota exceeded) we leave it as SUBMITTED
            # so the instructor or the client can retry via /run-grading.
            try:
                attempt.refresh_from_db()
                attempt.calculate_score()
            except Exception:
                pass  # Status stays SUBMITTED; client should show retry/poll UI.

            attempt.refresh_from_db()
            # Enforce visibility policy regardless of final grading status.
            if assessment.results_visibility == Assessment.ResultsVisibility.PUBLIC:
                attempt.is_public_result = True
            elif assessment.results_visibility == Assessment.ResultsVisibility.PRIVATE:
                attempt.is_public_result = False
            attempt.save(update_fields=['is_public_result'])
            return Response(UserAttemptSerializer(attempt).data)

        # All questions are auto-gradable (MCQ / true_false / exact-match short_answer): score immediately.
        attempt.calculate_score()

        # Enforce creator-level visibility policy.
        if assessment.results_visibility == Assessment.ResultsVisibility.PUBLIC:
            attempt.is_public_result = True
        elif assessment.results_visibility == Assessment.ResultsVisibility.PRIVATE:
            attempt.is_public_result = False
        attempt.save(update_fields=['is_public_result'])
        
        return Response(UserAttemptSerializer(attempt).data)

    @action(detail=True, methods=['get'], url_path='my-attempt')
    def my_attempt(self, request, pk=None):
        """Return the current user's most recent attempt for this assessment (for polling after submit)."""
        assessment = self.get_object()
        attempt = UserAttempt.objects.filter(
            assessment=assessment,
            user=request.user
        ).order_by('-started_at').first()
        if not attempt:
            return Response({'detail': 'No attempt found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserAttemptSerializer(attempt).data)

    @action(detail=True, methods=['post'], url_path='run-grading')
    def run_grading(self, request, pk=None):
        """Start background grading for the current user's submitted attempt. Returns 202 immediately; poll my-attempt for status."""
        import threading
        assessment = self.get_object()
        attempt = UserAttempt.objects.filter(
            assessment=assessment,
            user=request.user,
            status=UserAttempt.Status.SUBMITTED
        ).first()
        if not attempt:
            return Response(
                {'detail': 'No submitted attempt found to grade.'},
                status=status.HTTP_404_NOT_FOUND
            )

        def grade_in_background():
            try:
                attempt.refresh_from_db()
                if attempt.status == UserAttempt.Status.SUBMITTED:
                    attempt.calculate_score()
            except Exception:
                pass

        thread = threading.Thread(target=grade_in_background)
        thread.daemon = True
        thread.start()
        return Response(
            UserAttemptSerializer(attempt).data,
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=True, methods=['get'], url_path='public-results')
    def public_results(self, request, pk=None):
        assessment = self.get_object()
        base_qs = UserAttempt.objects.filter(
            assessment=assessment,
            status=UserAttempt.Status.GRADED
        ).select_related('user')

        if assessment.results_visibility == Assessment.ResultsVisibility.PRIVATE:
            return Response([])
        if assessment.results_visibility == Assessment.ResultsVisibility.PUBLIC:
            attempts = base_qs
        else:
            attempts = base_qs.filter(is_public_result=True)

        serializer = UserAttemptSerializer(attempts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set-result-visibility')
    def set_result_visibility(self, request, pk=None):
        assessment = self.get_object()
        attempt = get_object_or_404(
            UserAttempt,
            assessment=assessment,
            user=request.user,
            status=UserAttempt.Status.GRADED
        )
        requested = bool(request.data.get('is_public_result', False))

        if assessment.results_visibility == Assessment.ResultsVisibility.PUBLIC:
            attempt.is_public_result = True
        elif assessment.results_visibility == Assessment.ResultsVisibility.PRIVATE:
            attempt.is_public_result = False
        else:
            attempt.is_public_result = requested

        attempt.save(update_fields=['is_public_result'])
        return Response(UserAttemptSerializer(attempt).data)

    @action(detail=True, methods=['get'], url_path='attempts')
    def attempts(self, request, pk=None):
        assessment = self.get_object()
        share_token = request.query_params.get('share_token')
        if assessment.creator != request.user and share_token != str(assessment.share_token):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        attempts = UserAttempt.objects.filter(assessment=assessment).select_related('user')
        serializer = UserAttemptSerializer(attempts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='manual-grade')
    def manual_grade(self, request, pk=None):
        assessment = self.get_object()
        share_token = request.query_params.get('share_token')
        if assessment.creator != request.user and share_token != str(assessment.share_token):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ManualGradeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        attempt = get_object_or_404(UserAttempt, id=serializer.validated_data['attempt_id'], assessment=assessment)
        attempt.score = serializer.validated_data['score']
        attempt.percentage = serializer.validated_data['percentage']
        attempt.status = UserAttempt.Status.GRADED
        attempt.save()
        return Response(UserAttemptSerializer(attempt).data)

    @action(detail=True, methods=['get'], url_path='export-attempts')
    def export_attempts(self, request, pk=None):
        assessment = self.get_object()
        share_token = request.query_params.get('share_token')
        if assessment.creator != request.user and share_token != str(assessment.share_token):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        import csv
        from io import StringIO
        from django.http import HttpResponse

        attempts = UserAttempt.objects.filter(assessment=assessment).select_related('user')
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            'attempt_id',
            'user',
            'score',
            'percentage',
            'status',
            'is_public_result',
            'submitted_at',
            'answers_json',
            'answer_images'
        ])
        for attempt in attempts:
            writer.writerow([
                attempt.id,
                attempt.user.username,
                attempt.score,
                attempt.percentage,
                attempt.status,
                attempt.is_public_result,
                attempt.submitted_at,
                attempt.answers,
                '; '.join([img.image.url for img in attempt.answer_images.all()])
            ])

        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename=assessment_{assessment.id}_attempts.csv'
        return response

    @action(detail=True, methods=['get'], url_path='export-attempts-pdf')
    def export_attempts_pdf(self, request, pk=None):
        assessment = self.get_object()
        share_token = request.query_params.get('share_token')
        if assessment.creator != request.user and share_token != str(assessment.share_token):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        from django.http import HttpResponse
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from io import BytesIO

        attempts = UserAttempt.objects.filter(assessment=assessment).select_related('user')
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # center
        )
        elements.append(Paragraph(f"Assessment: {assessment.title}", title_style))
        elements.append(Spacer(1, 12))

        # Table headers
        data = [['User', 'Score', 'Percentage', 'Status', 'Submitted At']]
        for attempt in attempts:
            data.append([
                attempt.user.username,
                attempt.score or '-',
                f"{attempt.percentage}%" if attempt.percentage is not None else '-',
                attempt.status,
                attempt.submitted_at.strftime('%Y-%m-%d %H:%M') if attempt.submitted_at else '-'
            ])

        table = Table(data, colWidths=[2*inch, 1*inch, 1*inch, 1*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=assessment_{assessment.id}_attempts.pdf'
        return response

    @action(detail=True, methods=['post'], url_path='join-challenge')
    def join_challenge(self, request, pk=None):
        assessment = self.get_object()
        # Create or get a lightweight challenge around this assessment.
        from study_groups.models import StudyGroup, StudyGroupChallenge, ChallengeParticipation

        group, _ = StudyGroup.objects.get_or_create(
            name=f"Challenge: {assessment.title}",
            defaults={
                'description': f"Challenge group for {assessment.title}",
                'creator': request.user,
            }
        )

        # Ensure the user is also a member of the group.
        group.members.add(request.user)

        challenge, _ = StudyGroupChallenge.objects.get_or_create(
            group=group,
            assessment=assessment,
            defaults={
                'title': f"Challenge: {assessment.title}",
                'description': f"Complete {assessment.title}",
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=7),
            }
        )

        participation, created = ChallengeParticipation.objects.get_or_create(
            challenge=challenge,
            user=request.user,
            defaults={'completed': False, 'score': 0}
        )
        if not created:
            return Response({'detail': 'Already joined challenge.'}, status=status.HTTP_200_OK)
        return Response({'detail': 'Joined challenge successfully.'})

    @action(detail=True, methods=['post'], url_path='send-challenge')
    def send_challenge(self, request, pk=None):
        """Send a challenge notification to a specific user."""
        assessment = self.get_object()
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({'detail': 'target_user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = UserModel.objects.get(pk=target_user_id)
        except UserModel.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target_user == request.user:
            return Response({'detail': 'You cannot challenge yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        Notification.objects.create(
            recipient=target_user,
            sender=request.user,
            notif_type='challenge',
            title=f'{request.user.username} challenged you!',
            message=f'{request.user.username} has challenged you to take "{assessment.title}". Think you can beat their score?',
            assessment_id=assessment.id,
            share_token=assessment.share_token or '',
        )
        return Response({'detail': f'Challenge sent to {target_user.username}.'})

    @action(detail=True, methods=['post'], url_path='publish-public-challenge')
    def publish_public_challenge(self, request, pk=None):
        """Creator only: list this assessment as a public challenge so all platform users can discover it."""
        assessment = self.get_object()
        if assessment.creator != request.user:
            return Response({'detail': 'Only the assessment creator can publish a public challenge.'}, status=status.HTTP_403_FORBIDDEN)
        from study_groups.models import StudyGroup, StudyGroupChallenge, ChallengeParticipation

        group, _ = StudyGroup.objects.get_or_create(
            name=f"Challenge: {assessment.title}",
            defaults={
                'description': f"Challenge group for {assessment.title}",
                'creator': request.user,
            }
        )
        group.members.add(request.user)

        challenge, created = StudyGroupChallenge.objects.get_or_create(
            group=group,
            assessment=assessment,
            defaults={
                'title': f"Challenge: {assessment.title}",
                'description': f"Complete {assessment.title}",
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=7),
                'is_public_listing': True,
            }
        )
        if not created:
            challenge.is_public_listing = True
            challenge.save(update_fields=['is_public_listing'])

        ChallengeParticipation.objects.get_or_create(
            challenge=challenge,
            user=request.user,
            defaults={'completed': False, 'score': 0}
        )
        return Response({
            'detail': 'Challenge is now public. It will appear in Public challenges for everyone on the platform.',
            'assessment_id': assessment.id,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='public-challenges')
    def public_challenges(self, request):
        """List assessments that are currently listed as public challenges (discoverable by all users)."""
        from study_groups.models import StudyGroupChallenge
        now = timezone.now()
        qs = StudyGroupChallenge.objects.filter(
            is_public_listing=True,
            assessment__isnull=False,
            assessment__is_public=True,
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=now)
        ).select_related('assessment').order_by('-created_at')[:50]
        out = []
        for ch in qs:
            a = ch.assessment
            out.append({
                'id': a.id,
                'title': a.title,
                'topic': getattr(a, 'topic', '') or 'General',
                'question_count': a.questions.count(),
                'time_limit_minutes': getattr(a, 'time_limit_minutes', None) or 30,
                'share_token': str(a.share_token) if a.share_token else None,
                'creator_username': a.creator.username if a.creator_id else None,
                'challenge_end_date': ch.end_date.isoformat() if ch.end_date else None,
            })
        return Response(out)

    @action(detail=True, methods=['post'], url_path='upload-answer-image')
    def upload_answer_image(self, request, pk=None):
        """Upload an image answer for a specific question in this assessment."""
        assessment = self.get_object()
        # Allow uploads while attempt is in progress, or for a short grace period
        # after submission when image_upload_grace_minutes > 0.
        attempt = UserAttempt.objects.filter(
            user=request.user,
            assessment=assessment,
            status__in=[UserAttempt.Status.IN_PROGRESS, UserAttempt.Status.SUBMITTED],
        ).first()
        if not attempt:
            return Response(
                {'detail': 'No active attempt found for image upload.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        grace_minutes = getattr(assessment, 'image_upload_grace_minutes', 0) or 0
        if grace_minutes <= 0 and attempt.status != UserAttempt.Status.IN_PROGRESS:
            return Response(
                {'detail': 'Image uploads are only allowed while the assessment is in progress.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce grace window when configured.
        from django.utils import timezone
        now = timezone.now()

        if grace_minutes > 0:
            # Base end time: submitted_at when available, else started_at + time_limit.
            if attempt.submitted_at:
                base_end = attempt.submitted_at
            else:
                minutes = getattr(assessment, 'time_limit_minutes', 30) or 30
                base_end = attempt.started_at + timezone.timedelta(minutes=minutes)
            cutoff = base_end + timezone.timedelta(minutes=grace_minutes)
            if now > cutoff:
                return Response(
                    {'detail': 'The image upload window for this assessment has closed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = AssessmentAnswerImageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(attempt=attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='toggle-student-results',
            permission_classes=[permissions.IsAuthenticated])
    def toggle_student_results(self, request, pk=None):
        """Creator: toggle whether students can see their own results."""
        assessment = self.get_object()
        if assessment.creator != request.user and not request.user.is_superuser:
            return Response({'detail': 'Only the creator can control result visibility.'}, status=status.HTTP_403_FORBIDDEN)
        assessment.allow_students_see_results = not assessment.allow_students_see_results
        assessment.save(update_fields=['allow_students_see_results', 'updated_at'])
        return Response({
            'allow_students_see_results': assessment.allow_students_see_results,
            'detail': f"Students {'can' if assessment.allow_students_see_results else 'cannot'} now see their results.",
        })

    @action(detail=True, methods=['post'], url_path='ai-grade-all',
            permission_classes=[permissions.IsAuthenticated])
    def ai_grade_all(self, request, pk=None):
        """Creator: trigger AI grading for all SUBMITTED attempts in background."""
        import threading

        assessment = self.get_object()
        if assessment.creator != request.user and not request.user.is_superuser:
            return Response({'detail': 'Only the creator can trigger bulk AI grading.'}, status=status.HTTP_403_FORBIDDEN)

        submitted = list(
            UserAttempt.objects.filter(assessment=assessment, status=UserAttempt.Status.SUBMITTED)
        )
        if not submitted:
            return Response({'detail': 'No submitted attempts to grade.', 'count': 0})

        def _grade_all():
            for attempt in submitted:
                try:
                    attempt.refresh_from_db()
                    if attempt.status == UserAttempt.Status.SUBMITTED:
                        attempt.calculate_score()
                except Exception:
                    pass

        t = threading.Thread(target=_grade_all, daemon=True)
        t.start()
        return Response({
            'detail': f'AI grading started for {len(submitted)} attempt(s). Results will appear shortly.',
            'count': len(submitted),
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'])
    def my_assessments(self, request):
        """Get assessments created by the current user."""
        assessments = Assessment.objects.filter(creator=request.user)
        serializer = AssessmentListSerializer(assessments, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing questions."""
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """Ensure the user owns the assessment before adding a question."""
        assessment = serializer.validated_data['assessment']
        if assessment.creator != self.request.user:
            raise permissions.PermissionDenied(
                "You don't have permission to add questions to this assessment."
            )
        serializer.save()


class UserAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing user attempts."""
    serializer_class = UserAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own attempts."""
        return UserAttempt.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get user's assessment history."""
        attempts = UserAttempt.objects.filter(
            user=request.user,
            status=UserAttempt.Status.GRADED
        )
        serializer = UserAttemptSerializer(attempts, many=True)
        return Response(serializer.data)


# ── Recommendation endpoint ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def recommend_assessments_view(request):
    """
    GET /api/assessments/recommend/?limit=6

    Returns personalised assessment recommendations based on the user's
    topic_mastery profile. Also returns the full mastery dict so the
    frontend can render progress bars.
    """
    from .recommendation import recommend_assessments

    limit = min(int(request.GET.get('limit', 6)), 12)
    recs  = recommend_assessments(request.user, limit=limit)

    result = []
    for rec in recs:
        serializer = AssessmentListSerializer(
            rec['assessment'], context={'request': request}
        )
        result.append({
            **serializer.data,
            'rec_reason':     rec['reason'],
            'rec_topic':      rec['topic'],
            'rec_difficulty': rec['difficulty'],
            'rec_mastery_pct': rec['mastery_pct'],
            'rec_priority':   rec['priority'],
        })

    return Response({
        'recommended': result,
        'mastery':     request.user.topic_mastery or {},
        'total_found': len(result),
    })
