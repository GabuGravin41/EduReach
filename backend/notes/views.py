from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Note
from .serializers import NoteSerializer


class NoteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user notes."""
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return notes for the current user only."""
        return Note.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def by_lesson(self, request, lesson_id=None):
        """Get note for a specific lesson."""
        lesson_id = request.query_params.get('lesson_id')
        if not lesson_id:
            return Response(
                {'error': 'lesson_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            note = Note.objects.get(user=request.user, lesson_id=lesson_id)
            serializer = self.get_serializer(note)
            return Response(serializer.data)
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def save_or_update(self, request):
        """Save or update a note for a lesson."""
        lesson_id = request.data.get('lesson_id')
        content = request.data.get('content', '')
        
        if not lesson_id:
            return Response(
                {'error': 'lesson_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            note, created = Note.objects.update_or_create(
                user=request.user,
                lesson_id=lesson_id,
                defaults={'content': content}
            )
            serializer = self.get_serializer(note)
            return Response(
                {
                    'success': True,
                    'created': created,
                    'data': serializer.data
                },
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
