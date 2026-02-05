from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Assessment, Question, UserAttempt, AssessmentAnswerImage
from .serializers import (
    AssessmentSerializer, AssessmentListSerializer,
    QuestionSerializer, QuestionWithoutAnswerSerializer,
    UserAttemptSerializer, SubmitAnswersSerializer,
    AssessmentAnswerImageSerializer, ManualGradeSerializer
)
from courses.permissions import IsOwnerOrReadOnly


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
        if self.request.user.is_authenticated:
            return Assessment.objects.filter(
                models.Q(is_public=True) | models.Q(creator=self.request.user)
            )
        return Assessment.objects.filter(is_public=True)

    def perform_create(self, serializer):
        """Set the creator to the current user."""
        serializer.save(creator=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        assessment = self.get_object()
        share_token = request.query_params.get('share_token')
        if assessment.creator != request.user and share_token != str(assessment.share_token):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

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
        
        # Update answers and calculate score
        attempt.answers = serializer.validated_data['answers']
        attempt.calculate_score()
        
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
        writer.writerow(['attempt_id', 'user', 'score', 'percentage', 'status', 'submitted_at'])
        for attempt in attempts:
            writer.writerow([
                attempt.id,
                attempt.user.username,
                attempt.score,
                attempt.percentage,
                attempt.status,
                attempt.submitted_at,
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
        # Create or get study group challenge for this assessment
        from study_groups.models import StudyGroup, StudyGroupChallenge, ChallengeParticipation
        # Find or create a default study group for this assessment
        group, _ = StudyGroup.objects.get_or_create(
            name=f"Challenge: {assessment.title}",
            defaults={
                'description': f"Challenge group for {assessment.title}",
                'creator': request.user,
                'is_active': True
            }
        )
        # Find or create challenge
        challenge, _ = StudyGroupChallenge.objects.get_or_create(
            study_group=group,
            assessment=assessment,
            defaults={
                'title': f"Challenge: {assessment.title}",
                'description': f"Complete {assessment.title}",
                'start_time': timezone.now(),
                'end_time': timezone.now() + timezone.timedelta(days=7),
                'is_active': True
            }
        )
        # Add participation
        participation, created = ChallengeParticipation.objects.get_or_create(
            user=request.user,
            challenge=challenge,
            defaults={'status': 'joined'}
        )
        if not created:
            return Response({'detail': 'Already joined challenge.'}, status=400)
        return Response({'detail': 'Joined challenge successfully.'})

    @action(detail=True, methods=['post'], url_path='upload-answer-image')
    def upload_answer_image(self, request, pk=None):
        """Upload an image answer for a specific question in this assessment."""
        assessment = self.get_object()
        attempt = get_object_or_404(
            UserAttempt,
            user=request.user,
            assessment=assessment,
            status=UserAttempt.Status.IN_PROGRESS
        )

        serializer = AssessmentAnswerImageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(attempt=attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
