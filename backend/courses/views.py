from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from .models import Course, Lesson, UserProgress
from .serializers import (
    CourseSerializer, CourseListSerializer,
    LessonSerializer, UserProgressSerializer
)
from .permissions import IsOwnerOrReadOnly
from services.youtube_service import YouTubeTranscriptService


class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing courses."""
    queryset = Course.objects.filter(is_public=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_queryset(self):
        """Filter courses based on user permissions."""
        if self.request.user.is_authenticated:
            return Course.objects.filter(
                models.Q(is_public=True) | models.Q(owner=self.request.user)
            )
        return Course.objects.filter(is_public=True)

    def perform_create(self, serializer):
        """Set the owner to the current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def lessons(self, request, pk=None):
        """Get all lessons for a course."""
        course = self.get_object()
        lessons = course.lessons.all()
        serializer = LessonSerializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        """Get courses owned by the current user."""
        courses = Course.objects.filter(owner=request.user)
        serializer = CourseListSerializer(courses, many=True)
        return Response(serializer.data)


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
        serializer.save()
    
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
        
        # Try to fetch transcript from YouTube
        try:
            service = YouTubeTranscriptService()
            
            # Get video URL or construct from video_id
            video_url = lesson.video_url or f"https://www.youtube.com/watch?v={lesson.video_id}"
            
            # Extract transcript
            result = service.extract_complete_video_data(video_url, language)
            
            if result.get('success'):
                # Save transcript to lesson
                transcript_data = result.get('transcript', {})
                lesson.transcript = transcript_data.get('transcript', '')
                lesson.transcript_language = language
                lesson.transcript_fetched_at = timezone.now()
                
                # Also update video metadata if missing
                metadata = result.get('metadata', {})
                if not lesson.video_url:
                    lesson.video_url = video_url
                if lesson.duration == 'N/A' and metadata.get('duration'):
                    lesson.duration = str(metadata.get('duration'))
                
                lesson.save()
                
                return Response({
                    'success': True,
                    'message': 'Transcript fetched successfully',
                    'transcript': lesson.transcript,
                    'source': 'youtube',
                    'metadata': metadata,
                    'available_languages': result.get('available_languages', [])
                })
            else:
                # Auto-fetch failed
                error_message = result.get('error', 'Failed to fetch transcript')
                
                # Check if manual transcript exists
                if lesson.manual_transcript:
                    return Response({
                        'success': True,
                        'message': 'Auto-fetch failed, using manual transcript',
                        'transcript': lesson.manual_transcript,
                        'source': 'manual',
                        'auto_fetch_error': error_message
                    })
                else:
                    return Response({
                        'success': False,
                        'error': error_message,
                        'message': 'Please provide a manual transcript as fallback',
                        'can_paste_manual': True
                    }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
                    
        except Exception as e:
            # Exception during fetch
            if lesson.manual_transcript:
                return Response({
                    'success': True,
                    'message': 'Auto-fetch error, using manual transcript',
                    'transcript': lesson.manual_transcript,
                    'source': 'manual',
                    'auto_fetch_error': str(e)
                })
            else:
                return Response({
                    'success': False,
                    'error': f'Error fetching transcript: {str(e)}',
                    'message': 'Please provide a manual transcript as fallback',
                    'can_paste_manual': True
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
        
        # Call AI service to generate quiz
        try:
            from django.conf import settings
            import google.generativeai as genai
            import json
            
            # Validate GEMINI_API_KEY
            if not settings.GEMINI_API_KEY:
                return Response({
                    'error': 'GEMINI_API_KEY is not configured. Please set it in your environment variables.',
                    'can_fetch': False
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Configure Gemini
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Construct prompt
            prompt = f"""
            Based on the following video transcript, generate {num_questions} {difficulty} difficulty quiz questions.
            
            Transcript:
            {transcript[:3000]}  # Limit to first 3000 chars to avoid token limits
            
            Please generate questions in the following JSON format:
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
            """
            
            # Generate content
            response = model.generate_content(prompt)
            
            # Parse response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            quiz_data = json.loads(response_text)
            
            return Response({
                'success': True,
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'quiz': quiz_data,
                'transcript_source': 'auto' if lesson.transcript else 'manual'
            })
            
        except json.JSONDecodeError:
            return Response({
                'success': False,
                'error': 'Failed to parse AI response',
                'raw_response': response.text
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
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
        from django.conf import settings
        import google.generativeai as genai
        
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
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(context)
            
            return Response({
                'success': True,
                'response': response.text,
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
