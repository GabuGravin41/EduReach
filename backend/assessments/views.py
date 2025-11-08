from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Assessment, Question, UserAttempt
from .serializers import (
    AssessmentSerializer, AssessmentListSerializer,
    QuestionSerializer, QuestionWithoutAnswerSerializer,
    UserAttemptSerializer, SubmitAnswersSerializer
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

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Get all questions for an assessment."""
        assessment = self.get_object()
        questions = assessment.questions.all()
        
        # Hide correct answers for students taking the assessment
        if request.user != assessment.creator:
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
