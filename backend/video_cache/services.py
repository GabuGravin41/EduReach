import json
import logging
from .models import VideoCache
from ai_service.views import call_ai

logger = logging.getLogger(__name__)

def extract_knowledge_for_video(video: VideoCache) -> bool:
    if not video.transcript:
        logger.warning(f"Video {video.video_id} has no transcript to process.")
        return False
        
    prompt = f"""You are an expert curriculum designer. I am providing you with a transcript from an educational video.

Your task is to extract the core knowledge from this text and return it EXCLUSIVELY as a JSON object matching the following structure:

{{
  "concepts": [
    {{
      "name": "Concept Name",
      "explanation": "Clear explanation",
      "difficulty_level": "beginner|intermediate|advanced"
    }}
  ],
  "relationships": [
    {{
      "source_concept": "Concept A",
      "target_concept": "Concept B",
      "relationship_type": "depends_on|is_example_of|related_to"
    }}
  ],
  "quizzes": [
    {{
      "question": "Sample question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "tested_concept": "Concept Name"
    }}
  ]
}}

Transcript:
{video.transcript[:30000]}
"""

    try:
        # Increase max_tokens since we expect a comprehensive JSON back
        response_text = call_ai(prompt, max_tokens=3500)
        
        # Clean response text just in case the LLM wrapped it in markdown
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        data = json.loads(cleaned_text)
        
        video.concepts = data.get('concepts', [])
        video.relationships = data.get('relationships', [])
        video.quizzes = data.get('quizzes', [])
        video.is_processed = True
        video.save(update_fields=['concepts', 'relationships', 'quizzes', 'is_processed'])
        
        return True
    except Exception as e:
        logger.error(f"Failed to extract knowledge for video {video.video_id}: {e}")
        return False
