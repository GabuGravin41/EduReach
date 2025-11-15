from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import google.generativeai as genai
import json
import logging

logger = logging.getLogger(__name__)

def configure_gemini():
    """Configure Gemini API with the API key from settings."""
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not configured in settings")
        raise ValueError("GEMINI_API_KEY is not configured in settings")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    logger.info("Gemini API configured successfully")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quiz(request):
    """
    Generate a quiz from transcript using Gemini API.
    
    Expected request body:
    {
        "transcript": "string",
        "num_questions": int (optional, default: 5),
        "difficulty": "easy|medium|hard" (optional, default: "medium")
    }
    """
    try:
        # Get request data
        transcript = request.data.get('transcript', '')
        num_questions = request.data.get('num_questions', 5)
        difficulty = request.data.get('difficulty', 'medium')
        
        if not transcript:
            return Response(
                {'error': 'Transcript is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash'))
        
        # Construct the prompt - optimized for speed
        prompt = f"""Generate {num_questions} {difficulty} difficulty quiz questions from this transcript:

{transcript}

Return ONLY valid JSON (no extra text):
{{"questions": [{{"question": "?", "type": "mcq", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Why"}}]}}

Be concise. Questions should test key concepts."""
        
        # Generate content with faster, concise output
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=1000, temperature=0.7)
        )
        response = model.generate_content(prompt)
        
        # Try to parse the response as JSON
        try:
            # Extract JSON from response
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
            
            return Response(quiz_data, status=status.HTTP_200_OK)
        except json.JSONDecodeError:
            # If JSON parsing fails, return the raw response
            return Response(
                {'raw_response': response.text},
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}", exc_info=True)
        return Response(
            {'error': str(e), 'type': type(e).__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    """
    Handle chat messages with Gemini API.
    
    Expected request body:
    {
        "message": "string",
        "context": "string" (optional, for providing additional context)
    }
    """
    try:
        # Get request data
        message = request.data.get('message', '')
        context = request.data.get('context', '')
        
        if not message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash'))
        
        # Construct the full prompt with context and system instructions
        system_instruction = """You are a helpful educational tutor. Keep your responses:
- Concise
- Conversational
- Direct and to the point

If the user asks a question about the video content, answer based on the provided context.
If they ask something off-topic but related, answer it gracefully, else, politely redirect them back to the learning material."""
        
        if context:
            full_prompt = f"{system_instruction}\n\nVideo/Learning Context:\n{context}\n\nUser Question: {message}"
        else:
            full_prompt = f"{system_instruction}\n\nUser Question: {message}"
        
        # Generate content with reduced token output
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=150)
        )
        
        return Response(
            {'response': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}", exc_info=True)
        return Response(
            {'error': str(e), 'type': type(e).__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_plan(request):
    """
    Generate a personalized study plan using Gemini API.
    
    Expected request body:
    {
        "topic": "string",
        "duration_weeks": int,
        "skill_level": "beginner|intermediate|advanced",
        "goals": "string" (optional)
    }
    """
    try:
        # Get request data
        topic = request.data.get('topic', '')
        duration_weeks = request.data.get('duration_weeks', 4)
        skill_level = request.data.get('skill_level', 'beginner')
        goals = request.data.get('goals', '')
        
        if not topic:
            return Response(
                {'error': 'Topic is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash'))
        
        # Construct a concise prompt
        prompt = f"""Create a {duration_weeks}-week study plan for {topic} ({skill_level} level).
{f"Goal: {goals}" if goals else ""}

Format as:
Week 1-2: [topics] | Time: [hours/week]
Week 3-4: [topics] | Time: [hours/week]
...
Key resources: [3-4 links]
Milestones: [checkpoints]

Keep it concise and actionable."""
        
        # Generate content with moderate output
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=600, temperature=0.7)
        )
        
        return Response(
            {'study_plan': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def explain_concept(request):
    """
    Get a detailed explanation of a concept using Gemini API.
    
    Expected request body:
    {
        "concept": "string",
        "detail_level": "simple|detailed|technical" (optional, default: "detailed")
    }
    """
    try:
        # Get request data
        concept = request.data.get('concept', '')
        detail_level = request.data.get('detail_level', 'detailed')
        
        if not concept:
            return Response(
                {'error': 'Concept is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Configure Gemini
        configure_gemini()
        
        # Create the model
        model = genai.GenerativeModel(getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash'))
        
        # Construct a concise prompt based on detail level
        level_prompts = {
            'simple': f'Explain "{concept}" in 2-3 sentences using simple language and a real-world example.',
            'detailed': f'Explain "{concept}" with definition, 2-3 examples, and key points (under 200 words).',
            'technical': f'Give a technical explanation of "{concept}" with precise definitions and advanced details (under 200 words).'
        }
        
        prompt = level_prompts.get(detail_level, level_prompts['detailed'])
        
        # Generate content with concise output
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=300, temperature=0.7)
        )
        
        return Response(
            {'explanation': response.text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
