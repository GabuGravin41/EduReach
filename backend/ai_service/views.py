from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import google.generativeai as genai
import json
import logging
import re
import requests

logger = logging.getLogger(__name__)


def _is_rate_limit_error(exc: Exception) -> bool:
    try:
        text = str(exc)
        if 'RESOURCE_EXHAUSTED' in text or 'quota' in text.lower() or '429' in text:
            return True
    except Exception:
        pass
    return False


def call_generate_content_with_handling(model, *args, **kwargs):
    try:
        return model.generate_content(*args, **kwargs)
    except Exception as e:
        if _is_rate_limit_error(e):
            # Raise a specific error that callers can translate to 429
            raise RuntimeError('GEMINI_QUOTA_EXCEEDED: ' + str(e))
        raise


def call_gemini(prompt: str, max_output_tokens: int = 400):
    """Call Gemini model with basic configuration and error handling.

    Raises RuntimeError('GEMINI_QUOTA_EXCEEDED: ...') when quota/rate limit issues
    are detected so callers can trigger OpenRouter fallback.
    """
    configure_gemini()

    model_name = getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash')
    if 'flash' not in model_name.lower():
        # Ensure we use a fast, cheaper model by default
        model_name = 'gemini-2.5-flash'

    model = genai.GenerativeModel(model_name)
    logger.debug("Calling Gemini model %s", model_name)

    # Use helper that normalizes rate limit / quota errors
    response = call_generate_content_with_handling(
        model,
        prompt,
        generation_config={
            'max_output_tokens': max_output_tokens,
        },
    )
    return response


def call_openrouter(prompt: str, model_name: str = None, max_tokens: int = 400):
    """Simple OpenRouter invocation as a fallback provider.

    Uses settings.OPENROUTER_API_KEY and optional settings.OPENROUTER_API_URL.
    Returns an object with a .text attribute for compatibility with Gemini responses.
    """
    api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if not api_key:
        raise RuntimeError('OPENROUTER_API_KEY not configured')

    api_url = getattr(settings, 'OPENROUTER_API_URL', 'https://api.openrouter.ai/v1/chat/completions')
    model = model_name or getattr(settings, 'OPENROUTER_MODEL', 'gpt-4o-mini')

    payload = {
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': max_tokens,
    }

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    app_url = getattr(settings, 'OPENROUTER_APP_URL', None)
    app_name = getattr(settings, 'OPENROUTER_APP_NAME', None)
    if app_url:
        headers['HTTP-Referer'] = app_url
    if app_name:
        headers['X-Title'] = app_name

    resp = requests.post(api_url, json=payload, headers=headers, timeout=60)
    if resp.status_code >= 400:
        logger.error(
            "OpenRouter error: %s %s", resp.status_code, resp.text
        )
        raise RuntimeError(f'OpenRouter error: {resp.status_code} {resp.text}')

    data = resp.json()
    # Try common response shapes
    text = None
    try:
        text = data.get('choices', [])[0].get('message', {}).get('content')
    except Exception:
        pass
    if not text:
        try:
            text = data.get('choices', [])[0].get('text')
        except Exception:
            pass
    if not text:
        # fallback to raw stringified body
        text = json.dumps(data)

    class _R:
        def __init__(self, t):
            self.text = t

    return _R(text)


def call_ai(prompt: str, *, max_tokens: int = 400, prefer_openrouter: bool | None = None):
    """Unified AI entry point.

    - Uses Gemini as primary when GEMINI_API_KEY is configured and
      PREFER_OPENROUTER is False.
    - When Gemini quota is exceeded or a clear rate/429 error is detected,
      falls back to OpenRouter.
    - If Gemini is not configured or prefer_openrouter is True, goes straight
      to OpenRouter.
    """
    # Determine preference: explicit arg overrides settings, else use settings
    if prefer_openrouter is None:
        prefer_openrouter = getattr(settings, 'PREFER_OPENROUTER', False)

    gemini_configured = bool(getattr(settings, 'GEMINI_API_KEY', None))

    # Try Gemini first when configured and not preferring OpenRouter
    if gemini_configured and not prefer_openrouter:
        try:
            resp = call_gemini(prompt, max_output_tokens=max_tokens)
            return resp.text
        except RuntimeError as e:
            # Explicitly tagged quota/429 errors from call_generate_content_with_handling
            if 'GEMINI_QUOTA_EXCEEDED' in str(e):
                logger.warning("Gemini quota exceeded, falling back to OpenRouter: %s", e)
            else:
                # Other runtime errors bubble up; they usually indicate misconfig
                logger.error("Gemini runtime error, falling back to OpenRouter: %s", e, exc_info=True)
            # Fall through to OpenRouter
        except Exception as e:
            # Any non-quota error from Gemini: log and fall back
            logger.error("Gemini call failed, falling back to OpenRouter: %s", e, exc_info=True)

    # If Gemini is not available or failed, use OpenRouter
    logger.debug("Calling OpenRouter as fallback (or primary if preferred)")
    resp = call_openrouter(prompt, max_tokens=max_tokens)
    return resp.text


def chunk_text_for_ai(text: str, max_chunk_size: int = 3500):
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        if current_chunk and len(current_chunk) + len(paragraph) + 2 > max_chunk_size:
            chunks.append(current_chunk.strip())
            current_chunk = ""

        if len(paragraph) > max_chunk_size:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', paragraph) if s.strip()]
            sentence_chunk = ""
            for sentence in sentences:
                if sentence_chunk and len(sentence_chunk) + len(sentence) + 1 > max_chunk_size:
                    chunks.append(sentence_chunk.strip())
                    sentence_chunk = ""
                sentence_chunk += (" " if sentence_chunk else "") + sentence
            if sentence_chunk:
                current_chunk += ("\n\n" if current_chunk else "") + sentence_chunk
        else:
            current_chunk += ("\n\n" if current_chunk else "") + paragraph

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def find_relevant_context_chunks(chunks, message: str, max_chunks: int = 3):
    if not chunks:
        return []

    keywords = [
        word for word in re.split(r'\s+', message.lower())
        if len(word) > 3 and word.isalpha()
    ]
    if not keywords:
        return chunks[:max_chunks]

    scored = []
    for index, chunk in enumerate(chunks):
        chunk_lower = chunk.lower()
        score = 0
        for keyword in keywords:
            exact = len(re.findall(rf'\b{re.escape(keyword)}\b', chunk_lower))
            score += exact * 3
            partial = len(re.findall(re.escape(keyword), chunk_lower))
            score += max(partial - exact, 0)
        score += (len(chunks) - index) * 0.1
        scored.append((score, chunk, index))

    scored.sort(key=lambda item: (-item[0], item[2]))
    relevant = [item[1] for item in scored[:max_chunks] if item[0] > 0]

    return relevant or chunks[:max_chunks]

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
        
        # Unified AI provider (Gemini primary, OpenRouter fallback)
        prompt = f"""Generate {num_questions} {difficulty} difficulty quiz questions from this transcript:

{transcript}

Return ONLY valid JSON (no extra text):
{{"questions": [{{"question": "?", "type": "mcq", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Why"}}]}}

Be concise. Questions should test key concepts."""

        # Call AI (Gemini first, OpenRouter fallback)
        response_text = call_ai(prompt, max_tokens=1000)

        # Try to parse the response as JSON
        try:
            # Extract JSON from response
            response_text = response_text.strip()
            
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
                {'raw_response': response_text},
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to generate quiz: {str(e)}', 'type': type(e).__name__},
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
        
        # Check if user wants detailed response (from message)
        wants_detailed = any(keyword in message.lower() for keyword in [
            'explain more', 'tell me more', 'detailed', 'deep dive', 
            'elaborate', 'in depth', 'expand', 'comprehensive'
        ])
        
        # Construct the full prompt with context and system instructions
        system_instruction = """You are Edu, a helpful and friendly AI educational tutor. Your responses should be:
- Concise and direct (unless user asks for more detail)
- Conversational and warm
- Based strictly on the provided video context
- Clear and easy to understand

If the user asks about video content, answer based on the context provided.
If they ask something off-topic, politely redirect them back to the learning material."""
        
        optimized_context = context
        if context and len(context) > 3500:
            context_chunks = chunk_text_for_ai(context)
            relevant_chunks = find_relevant_context_chunks(
                context_chunks,
                message,
                max_chunks=4 if wants_detailed else 2
            )
            optimized_context = "\n\n---\n\n".join(relevant_chunks)
            logger.debug(
                "Chat context reduced from %s chars to %s chars (chunks selected: %s)",
                len(context),
                len(optimized_context),
                len(relevant_chunks)
            )
        
        if optimized_context:
            full_prompt = f"{system_instruction}\n\nVideo/Learning Context:\n{optimized_context}\n\nUser Question: {message}"
        else:
            full_prompt = f"{system_instruction}\n\nUser Question: {message}"

        # Generate content with appropriate token limits using Gemini first, then OpenRouter
        max_tokens = 300 if wants_detailed else 150
        response_text = call_ai(full_prompt, max_tokens=max_tokens)

        return Response(
            {'response': response_text},
            status=status.HTTP_200_OK
        )
    
    except requests.exceptions.RequestException as e:
        logger.error(f"OpenRouter connectivity error in chat: {str(e)}", exc_info=True)
        return Response(
            {'error': 'AI service unreachable. Check network/DNS or OpenRouter URL.', 'type': type(e).__name__},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to generate response: {str(e)}', 'type': type(e).__name__},
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

        # Generate content with moderate output using Gemini first, then OpenRouter
        response_text = call_ai(prompt, max_tokens=600)

        return Response(
            {'study_plan': response_text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error generating study plan: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to generate study plan: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def summarize_chunks(request):
    """
    Summarize an array of transcript chunks and return per-chunk summaries plus a global summary.

    Expected body:
    {
        "chunks": ["text chunk 1", "text chunk 2", ...]
        -- OR --
        "transcript": "full transcript string"
    }
    """
    try:
        chunks = request.data.get('chunks')
        transcript = request.data.get('transcript', '')

        if not chunks and not transcript:
            return Response({'error': 'Either "chunks" or "transcript" is required'}, status=status.HTTP_400_BAD_REQUEST)

        # If transcript provided, chunk it using the same chunking as other endpoints
        if not chunks and transcript:
            chunks = chunk_text_for_ai(transcript)

        if not isinstance(chunks, list) or len(chunks) == 0:
            return Response({'error': 'No valid chunks to summarize'}, status=status.HTTP_400_BAD_REQUEST)

        chunk_summaries = []
        for idx, chunk_text in enumerate(chunks):
            try:
                prompt = f"""Summarize the following video transcript chunk in 2-3 concise sentences, then provide 3 bullet point key takeaways. Keep language simple and factual.

Chunk {idx+1} of {len(chunks)}:
{chunk_text}

Output:
Summary:\n- <one line summary>\nTakeaways:\n- item1\n- item2\n- item3
"""

                # Use unified AI provider (Gemini first, OpenRouter fallback)
                summary_text = call_ai(prompt, max_tokens=200)

                chunk_summaries.append({
                    'index': idx,
                    'summary': summary_text.strip()
                })
            except Exception as e:
                chunk_summaries.append({'index': idx, 'summary': f'Error generating summary: {str(e)}'})

        # Combine chunk summaries into a global summary
        try:
            combined_prompt = "Combine the following chunk summaries into a cohesive 3-4 sentence global summary and provide 5 concise key takeaways. Keep it factual and do not invent new information.\n\n" + "\n\n---\n\n".join([cs['summary'] for cs in chunk_summaries])

            global_summary = call_ai(combined_prompt, max_tokens=400).strip()
        except Exception as e:
            global_summary = f'Error generating global summary: {str(e)}'

        return Response({
            'success': True,
            'chunk_summaries': chunk_summaries,
            'global_summary': global_summary
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in summarize_chunks: {str(e)}", exc_info=True)
        return Response({'error': f'Failed to summarize chunks: {str(e)}', 'type': type(e).__name__}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        
        # Construct a concise prompt based on detail level
        level_prompts = {
            'simple': f'Explain "{concept}" in 2-3 sentences using simple language and a real-world example.',
            'detailed': f'Explain "{concept}" with definition, 2-3 examples, and key points (under 200 words).',
            'technical': f'Give a technical explanation of "{concept}" with precise definitions and advanced details (under 200 words).'
        }
        
        prompt = level_prompts.get(detail_level, level_prompts['detailed'])

        # Generate content with concise output using Gemini first, then OpenRouter
        response_text = call_ai(prompt, max_tokens=300)

        return Response(
            {'explanation': response_text},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error explaining concept: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to explain concept: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
