from celery import shared_task
import logging
from django.utils import timezone
from courses.models import Lesson
from services.youtube_service import YouTubeTranscriptService

logger = logging.getLogger(__name__)

@shared_task(name="ai_service.tasks.sync_transcript_task", bind=True, max_retries=3)
def sync_transcript_task(self, lesson_id):
    """
    Background task to fetch and save transcript for a lesson.
    """
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        logger.info(f"Starting transcript sync for lesson {lesson_id}: {lesson.title}")
        
        service = YouTubeTranscriptService()
        result = service.extract_transcript(lesson.video_id, lesson.transcript_language)
        
        if result.get('success'):
            # Prioritize timestamped transcript for better AI context
            lesson.transcript = result.get('timestamped_transcript') or result.get('transcript')
            lesson.transcript_fetched_at = timezone.now()
            lesson.save()
            logger.info(f"Successfully synced transcript for lesson {lesson_id} using {result.get('method')}")
            return {"status": "success", "method": result.get('method')}
        else:
            logger.warning(f"Failed to sync transcript for lesson {lesson_id}: {result.get('error')}")
            return {"status": "failed", "error": result.get('error')}
            
    except Lesson.DoesNotExist:
        logger.error(f"Lesson {lesson_id} not found for transcript sync.")
        return {"status": "error", "message": "Lesson not found"}
    except Exception as exc:
        logger.error(f"Error in sync_transcript_task for lesson {lesson_id}: {exc}")
        # Retry for external API errors
        raise self.retry(exc=exc, countdown=60)

@shared_task(name="ai_service.tasks.generate_bulk_quiz_task")
def generate_bulk_quiz_task(lesson_id, user_id, num_questions=20):
    """
    Planned: Large-scale quiz generation in chunks.
    (To be implemented based on need for 20+ question sets)
    """
    pass
