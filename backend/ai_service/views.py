from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import json
import logging
import re
import requests
from io import BytesIO

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - optional dependency safety
    PdfReader = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)


class AIProviderUnavailableError(RuntimeError):
    """Raised when all configured AI providers fail."""

    def __init__(self, details=None):
        self.details = details or []
        message = "No AI provider available."
        if self.details:
            message = f"{message} " + " | ".join(self.details)
        super().__init__(message)


def call_openrouter(
    prompt: str,
    model_name: str = None,
    max_tokens: int = 400,
    read_timeout_override: float | None = None,
):
    """Simple OpenRouter invocation as a fallback provider.

    Uses settings.OPENROUTER_API_KEY and optional settings.OPENROUTER_API_URL.
    Returns an object with a .text attribute for compatibility with Gemini responses.
    read_timeout_override: if set, use this for read timeout (e.g. 90 for quiz generation).
    """
    api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if not api_key or api_key in {'dev-key-not-configured', 'dummy-key-for-build'}:
        raise RuntimeError('OPENROUTER_API_KEY not configured')

    primary_api_url = getattr(settings, 'OPENROUTER_API_URL', 'https://openrouter.ai/api/v1/chat/completions')
    canonical = primary_api_url.replace('api.openrouter.ai', 'openrouter.ai')
    candidate_urls = list({canonical, 'https://openrouter.ai/api/v1/chat/completions'})
    model = model_name or getattr(settings, 'OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')

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

    connect_timeout = float(getattr(settings, 'OPENROUTER_CONNECT_TIMEOUT_SECONDS', 8))
    read_timeout = (
        read_timeout_override
        if read_timeout_override is not None
        else float(getattr(settings, 'OPENROUTER_READ_TIMEOUT_SECONDS', 45))
    )

    last_error = None
    data = None
    for api_url in candidate_urls:
        try:
            resp = requests.post(
                api_url,
                json=payload,
                headers=headers,
                timeout=(connect_timeout, read_timeout),
            )
            if resp.status_code >= 400:
                logger.error("OpenRouter error at %s: %s %s", api_url, resp.status_code, resp.text)
                last_error = RuntimeError(f'OpenRouter error at {api_url}: {resp.status_code} {resp.text}')
                continue
            data = resp.json()
            break
        except requests.exceptions.RequestException as e:
            logger.warning("OpenRouter connectivity issue at %s: %s", api_url, e)
            last_error = e
            continue

    if data is None:
        raise RuntimeError(f'OpenRouter request failed on all endpoints: {last_error}')

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


def call_ai(
    prompt: str,
    *,
    max_tokens: int = 400,
    prefer_openrouter: bool | None = None,
    openrouter_read_timeout: float | None = None,
):
    """Unified AI entry point using OpenRouter only (Gemini 2.0 Flash by default).

    All calls go through OpenRouter with the model defined in OPENROUTER_MODEL
    (default: google/gemini-2.0-flash-001). prefer_openrouter is accepted for
    backwards compatibility but no longer changes behaviour.
    """
    provider_failures = []

    def _short_error_text(error: Exception, max_chars: int = 240) -> str:
        text = str(error).replace('\n', ' ').strip()
        return text[:max_chars] + ('...' if len(text) > max_chars else '')

    try:
        resp = call_openrouter(
            prompt,
            max_tokens=max_tokens,
            read_timeout_override=openrouter_read_timeout,
        )
        return resp.text
    except Exception as e:
        logger.error("OpenRouter call failed: %s", e, exc_info=True)
        provider_failures.append(f'OpenRouter error: {_short_error_text(e)}')
        raise AIProviderUnavailableError(provider_failures)


def _check_ai_usage_quota(user):
    """Return (allowed: bool, usage_obj). Fails open if usage tracking is unavailable."""
    try:
        usage = user.get_current_usage()
        return usage.can_use_ai(), usage
    except Exception:
        logger.warning("AI usage quota check failed; allowing request", exc_info=True)
        return True, None


def _increment_ai_usage(user):
    """Increment AI usage count for the current month."""
    try:
        usage = user.get_current_usage()
        usage.ai_queries_used += 1
        usage.save(update_fields=['ai_queries_used', 'updated_at'])
    except Exception:
        logger.warning("Failed to increment AI usage counter", exc_info=True)


def _pdf_page_limit_for_user(user) -> int:
    tier = getattr(user, 'tier', 'free')
    if tier in ('pro_plus', 'admin'):
        return 40
    if tier == 'pro':
        return 20
    if tier == 'learner':
        return 8
    return 5


def _extract_text_from_pdf_file(uploaded_file, max_pages: int) -> tuple[str, int, int]:
    if PdfReader is None:
        raise RuntimeError('PDF parsing dependency not installed (pypdf).')

    if not uploaded_file:
        return '', 0, 0

    filename = getattr(uploaded_file, 'name', '') or ''
    if not filename.lower().endswith('.pdf'):
        raise ValueError('Only PDF files are supported for context upload.')

    raw = uploaded_file.read()
    reader = PdfReader(BytesIO(raw))
    total_pages = len(reader.pages)

    if total_pages > max_pages:
        raise ValueError(
            f'PDF has {total_pages} pages. Your tier allows up to {max_pages} pages for AI context.'
        )

    texts = []
    for i in range(total_pages):
        page = reader.pages[i]
        page_text = (page.extract_text() or '').strip()
        if page_text:
            texts.append(page_text)

    combined_text = '\n\n'.join(texts).strip()
    return combined_text, total_pages, len(combined_text)


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
        transcript = (request.data.get('transcript', '') or '').strip()
        num_questions = request.data.get('num_questions', 5)
        difficulty = request.data.get('difficulty', 'medium')
        uploaded_pdf = request.FILES.get('context_pdf')
        pdf_context = ''
        pdf_pages = 0
        
        can_use_ai, usage = _check_ai_usage_quota(request.user)
        if not can_use_ai:
            limits = usage.get_tier_limits() if usage else {'ai_queries': 0}
            return Response(
                {'error': f'Monthly AI limit reached ({limits["ai_queries"]}). Upgrade your plan to continue.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if uploaded_pdf:
            max_pages = _pdf_page_limit_for_user(request.user)
            try:
                pdf_context, pdf_pages, pdf_chars = _extract_text_from_pdf_file(uploaded_pdf, max_pages=max_pages)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error("Failed to parse PDF context: %s", e, exc_info=True)
                return Response(
                    {'error': 'Could not read PDF. Try a text-based PDF or fewer pages.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not pdf_context:
                return Response(
                    {'error': 'PDF uploaded, but no readable text was found.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Keep prompt size bounded to reduce token spend.
            if len(pdf_context) > 18000:
                pdf_context = pdf_context[:18000]

        combined_context_parts = []
        if transcript:
            combined_context_parts.append(transcript)
        if pdf_context:
            combined_context_parts.append(f"[PDF Context]\n{pdf_context}")
        combined_context = "\n\n---\n\n".join(combined_context_parts).strip()

        # Bound total context to keep generation latency predictable.
        # For larger question sets, use less context to leave more room for output.
        max_context_chars = 8000 if num_questions > 5 else 12000
        if len(combined_context) > max_context_chars:
            combined_context = combined_context[:max_context_chars]

        if not combined_context:
            return Response(
                {'error': 'Provide transcript text or upload a PDF context file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Unified AI provider (OpenRouter preferred, Gemini fallback if configured)
        prompt = f"""Generate exactly {num_questions} {difficulty} difficulty quiz questions from this transcript:

{combined_context}

IMPORTANT: Return ONLY valid JSON with exactly {num_questions} questions. Each question must be properly formatted.
You MUST return complete, valid JSON. Do NOT truncate or cut off the output — all {num_questions} questions must be included.

Use LaTeX ($...$ for inline, $$...$$ for block math) for any formulas:
{{"questions": [
  {{
    "question": "Sample question text?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Why this is correct"
  }}
]}}

Requirements:
- Generate exactly {num_questions} questions
- Mix question types: multiple choice, true/false, short answer
- For multiple choice: provide exactly 4 options as full text strings AND set correct_answer to the FULL TEXT of the correct option (not just a letter)
- For true/false: set correct_answer to "True" or "False"
- For short answer: provide the expected answer
- Include detailed explanations for all questions
- Questions should test key concepts from the transcript"""

        # Increase max tokens for larger question sets (4000 base + 600 per additional question)
        max_tokens_needed = min(4000 + (num_questions - 5) * 600, 12000) if num_questions > 5 else 4000
        prompt_continuation = '''IMPORTANT for valid JSON: Inside every JSON string value, escape backslashes by doubling them (e.g. write \\\\mathbb instead of \\mathbb).'''

        # Quiz is long-running: use OpenRouter first with longer read timeout to avoid pipeline timeout
        long_read = getattr(settings, 'OPENROUTER_READ_TIMEOUT_LONG_SECONDS', 90)
        response_text = call_ai(
            prompt + prompt_continuation,
            max_tokens=max_tokens_needed,
            prefer_openrouter=True,
            openrouter_read_timeout=long_read,
        )

        # Try to parse the response as JSON
        try:
            quiz_data = safe_json_loads(response_text)
            if quiz_data is None:
                raise ValueError("No JSON object found in response")
            
            _increment_ai_usage(request.user)

            payload = quiz_data
            if isinstance(payload, dict) and pdf_pages:
                payload['pdf_context_pages_used'] = pdf_pages
            return Response(payload, status=status.HTTP_200_OK)
        except (json.JSONDecodeError, ValueError) as e:
            # If JSON parsing fails, return the raw response for debugging/fallback
            logger.warning("generate_quiz: JSON decoding failed: %s", e)
            _increment_ai_usage(request.user)
            return Response(
                {
                    'error': 'Failed to parse AI output as JSON.',
                    'raw_response': response_text
                },
                status=status.HTTP_200_OK
            )
    
    except AIProviderUnavailableError as e:
        return Response(
            {
                'error': 'AI service temporarily unavailable. Verify OPENROUTER_API_KEY and provider quota, then retry.',
                'details': e.details,
                'type': type(e).__name__
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
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
        
        can_use_ai, usage = _check_ai_usage_quota(request.user)
        if not can_use_ai:
            limits = usage.get_tier_limits() if usage else {'ai_queries': 0}
            return Response(
                {'error': f'Monthly AI limit reached ({limits["ai_queries"]}). Upgrade your plan to continue.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
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
- If technical or mathematical content is involved, use LaTeX ($...$ for inline, $$...$$ for block math).

If the user asks about video content, answer based on the context provided.
If they ask something off-topic, politely redirect them back to the learning material."""
        
        optimized_context = context
        # Keep chat prompts tight for consistent latency on free-tier models.
        if context and len(context) > 2500:
            context_chunks = chunk_text_for_ai(context)
            relevant_chunks = find_relevant_context_chunks(
                context_chunks,
                message,
                max_chunks=2 if wants_detailed else 1
            )
            optimized_context = "\n\n---\n\n".join(relevant_chunks)
            logger.debug(
                "Chat context reduced from %s chars to %s chars (chunks selected: %s)",
                len(context),
                len(optimized_context),
                len(relevant_chunks)
            )
        if optimized_context and len(optimized_context) > 5000:
            optimized_context = optimized_context[:5000]
        
        if optimized_context:
            full_prompt = f"{system_instruction}\n\nVideo/Learning Context:\n{optimized_context}\n\nUser Question: {message}"
        else:
            full_prompt = f"{system_instruction}\n\nUser Question: {message}"

        # Generate content with appropriate token limits using Gemini first, then OpenRouter
        max_tokens = 220 if wants_detailed else 120
        response_text = call_ai(full_prompt, max_tokens=max_tokens)
        _increment_ai_usage(request.user)

        return Response(
            {'response': response_text},
            status=status.HTTP_200_OK
        )
    
    except AIProviderUnavailableError as e:
        logger.warning("AI unavailable in chat: %s", e)
        return Response(
            {
                'error': 'AI service temporarily unavailable. Verify OPENROUTER_API_KEY and provider quota, then retry.',
                'details': e.details,
                'type': type(e).__name__
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
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
        
        can_use_ai, usage = _check_ai_usage_quota(request.user)
        if not can_use_ai:
            limits = usage.get_tier_limits() if usage else {'ai_queries': 0}
            return Response(
                {'error': f'Monthly AI limit reached ({limits["ai_queries"]}). Upgrade your plan to continue.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
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
        _increment_ai_usage(request.user)

        return Response(
            {'study_plan': response_text},
            status=status.HTTP_200_OK
        )
    
    except AIProviderUnavailableError as e:
        logger.warning("AI unavailable in generate_study_plan: %s", e)
        return Response(
            {
                'error': 'AI service temporarily unavailable. Verify OPENROUTER_API_KEY and provider quota, then retry.',
                'details': e.details,
                'type': type(e).__name__
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
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
        can_use_ai, usage = _check_ai_usage_quota(request.user)
        if not can_use_ai:
            limits = usage.get_tier_limits() if usage else {'ai_queries': 0}
            return Response(
                {'error': f'Monthly AI limit reached ({limits["ai_queries"]}). Upgrade your plan to continue.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

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

        _increment_ai_usage(request.user)

        return Response({
            'success': True,
            'chunk_summaries': chunk_summaries,
            'global_summary': global_summary
        }, status=status.HTTP_200_OK)

    except AIProviderUnavailableError as e:
        logger.warning("AI unavailable in summarize_chunks: %s", e)
        return Response(
            {
                'error': 'AI service temporarily unavailable. Verify OPENROUTER_API_KEY and provider quota, then retry.',
                'details': e.details,
                'type': type(e).__name__
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
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
        
        can_use_ai, usage = _check_ai_usage_quota(request.user)
        if not can_use_ai:
            limits = usage.get_tier_limits() if usage else {'ai_queries': 0}
            return Response(
                {'error': f'Monthly AI limit reached ({limits["ai_queries"]}). Upgrade your plan to continue.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Construct a concise prompt based on detail level
        level_prompts = {
            'simple': f'Explain "{concept}" in 2-3 sentences using simple language and a real-world example.',
            'detailed': f'Explain "{concept}" with definition, 2-3 examples, and key points (under 200 words). Use LaTeX ($...$ or $$...$$) for any math.',
            'technical': f'Give a technical explanation of "{concept}" with precise definitions and advanced details (under 200 words). Use LaTeX ($...$ or $$...$$) for equations.'
        }
        
        prompt = level_prompts.get(detail_level, level_prompts['detailed'])

        # Generate content with concise output using Gemini first, then OpenRouter
        response_text = call_ai(prompt, max_tokens=300)
        _increment_ai_usage(request.user)

        return Response(
            {'explanation': response_text},
            status=status.HTTP_200_OK
        )
    
    except AIProviderUnavailableError as e:
        logger.warning("AI unavailable in explain_concept: %s", e)
        return Response(
            {
                'error': 'AI service temporarily unavailable. Verify OPENROUTER_API_KEY and provider quota, then retry.',
                'details': e.details,
                'type': type(e).__name__
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.error(f"Error explaining concept: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to explain concept: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _fix_json_backslash_escapes(s: str) -> str:
    """
    Fix invalid JSON escape sequences (e.g. LaTeX \\mathbb, \\to) so json.loads succeeds.
    In JSON only \\ \" \\/ \\b \\f \\n \\r \\t \\uXXXX are valid. Double any other \\ + char.
    """
    if not s:
        return s
    result = []
    i = 0
    in_string = False
    escape = False
    while i < len(s):
        c = s[i]
        if escape:
            # We're right after a backslash inside a string
            if c in '"\\/bfnrt':
                result.append(c)
                i += 1
            elif c == 'u' and i + 4 < len(s) and re.match(r'[0-9a-fA-F]{4}', s[i + 1:i + 5]):
                result.append(s[i:i + 5])
                i += 5
            else:
                # Invalid escape: double the backslash (we already wrote one, write one more)
                result.append('\\')
                result.append(c)
                i += 1
            escape = False
            continue
        if in_string:
            if c == '\\':
                result.append(c)
                escape = True
                i += 1
            elif c == '"':
                result.append(c)
                in_string = False
                i += 1
            else:
                result.append(c)
                i += 1
        else:
            if c == '"':
                result.append(c)
                in_string = True
                i += 1
            else:
                result.append(c)
                i += 1
    return "".join(result)


def safe_json_loads(text: str):
    """
    Robustly extract and parse JSON from an AI response string.
    Handles markdown fences (```json), leading/trailing text, and LaTeX escape issues.
    """
    if not text:
        return None
    
    cleaned = text.strip()
    
    # 1. Strip markdown fences if present
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', cleaned)
    if json_match:
        cleaned = json_match.group(1).strip()
    
    # 2. Find the first '{' and last '}' to handle leading/trailing conversational text
    if not cleaned.startswith('{'):
        brace_match = re.search(r'\{[\s\S]*\}', cleaned)
        if brace_match:
            cleaned = brace_match.group(0)
    
    # 3. Fix invalid JSON escapes (e.g. LaTeX \mathbb, \to)
    cleaned = _fix_json_backslash_escapes(cleaned)
    
    # 4. Parse
    return json.loads(cleaned)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_questions(request):
    """
    Parse raw problem/solution text into structured question objects for the exam builder.

    The examiner pastes their problems and solutions in any format.  The AI
    detects the question type (mcq, true_false, short_answer, essay) and
    returns a ready-to-use JSON array of question objects.

    Expected request body:
    {
        "raw_text":   "string  — the problems + solutions pasted by the examiner",
        "topic":      "string  — optional subject hint so the AI can set better defaults",
        "time_hint":  int      — optional total exam minutes hint
    }
    """
    try:
        raw_text = (request.data.get('raw_text', '') or '').strip()
        topic = (request.data.get('topic', '') or '').strip()
        time_hint = request.data.get('time_hint', None)

        if not raw_text:
            return Response(
                {'error': 'raw_text is required — paste your problems and solutions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        can_use_ai, usage = _check_ai_usage_quota(request.user)
        if not can_use_ai:
            limits = usage.get_tier_limits() if usage else {'ai_queries': 0}
            return Response(
                {'error': f'Monthly AI limit reached ({limits["ai_queries"]}). Upgrade your plan to continue.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Limit input to keep token costs predictable
        if len(raw_text) > 12000:
            raw_text = raw_text[:12000]

        topic_hint = f" The subject/topic is: {topic}." if topic else ""
        time_hint_str = f" The intended total exam duration is {time_hint} minutes." if time_hint else ""

        prompt = f"""You are an expert exam formatter.{topic_hint}{time_hint_str}

The examiner has provided raw problems and solutions below. Your job is to parse each problem into a structured JSON question object.

Rules:
1. Detect the question type automatically:
   - "multiple_choice" — if the problem lists lettered/numbered options (A/B/C/D etc.)
   - "true_false" — if the answer is clearly True or False
   - "short_answer" — if the answer is a short fact, number, word, or phrase (≤ 20 words)
   - "essay" — if the answer requires a detailed explanation or paragraph response
2. For multiple_choice: extract exactly the options as an array; set correct_answer_index to the 0-based index of the correct option.
3. For true_false: set correct_answer to true or false (boolean).
4. For short_answer: set correct_answers as an array of acceptable answers (include any variants given).
5. For essay: set max_words based on expected answer length (default 300 if not clear); set ai_grading_enabled to true.
6. Always set points: 1 for short_answer/true_false, 2 for multiple_choice, 10 for essay (adjust if marks are explicitly stated).
7. CRITICAL: When the examiner provides both a problem and a solution/answer, you MUST put the full solution text in the "explanation" field (worked steps, full answer, or model solution). Do not leave explanation empty when a solution was given.
8. Keep question_text exactly as written (fix typos only if obvious).
9. For suggested_time_minutes: base it on the content (e.g. IMO-style or long proofs → 150–270 minutes; short quiz → 15–30). Ignore arbitrary short defaults when problems clearly need more time.
10. CRITICAL for valid JSON: Inside every JSON string value, escape backslashes by doubling them. For example write \\mathbb instead of \mathbb, and \\[ instead of \\. LaTeX and math use backslashes; in JSON a single backslash is an escape, so you must output \\ for each literal backslash so the parser does not fail.

RAW TEXT:
---
{raw_text}
---

Return ONLY valid JSON — no extra text, no markdown fences:
{{
  "questions": [
    {{
      "type": "multiple_choice",
      "question_text": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer_index": 0,
      "points": 2,
      "explanation": "Optional worked solution"
    }},
    {{
      "type": "true_false",
      "question_text": "Statement here",
      "correct_answer": true,
      "points": 1,
      "explanation": ""
    }},
    {{
      "type": "short_answer",
      "question_text": "Question here",
      "correct_answers": ["answer1", "answer2"],
      "case_sensitive": false,
      "max_length": 100,
      "points": 1,
      "explanation": ""
    }},
    {{
      "type": "essay",
      "question_text": "Essay prompt here",
      "max_words": 300,
      "ai_grading_enabled": true,
      "points": 10,
      "explanation": ""
    }}
  ],
  "suggested_time_minutes": 30,
  "detected_topic": "topic if identifiable"
}}"""

        response_text = call_ai(prompt, max_tokens=4000)
        _increment_ai_usage(request.user)

        try:
            result = safe_json_loads(response_text)
            if not result:
                raise ValueError("No JSON found")
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("parse_questions: JSON decode failed: %s\nRaw response:\n%s", e, response_text[:500])
            return Response(
                {
                    'error': 'AI returned malformed JSON. Try rephrasing your input or splitting into fewer questions.',
                    'raw_response': response_text[:1000],
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # Attach stable IDs and normalize solution → explanation so solutions pre-fill
        import time as _time
        questions = result.get('questions', [])
        for i, q in enumerate(questions):
            q['id'] = str(int(_time.time() * 1000) + i)
            # Normalize solution fields so the frontend always gets "explanation" for pre-fill
            explanation = q.get('explanation') or q.get('solution') or q.get('model_solution') or q.get('sample_answer')
            if explanation is not None:
                q['explanation'] = explanation if isinstance(explanation, str) else str(explanation)

        return Response({
            'questions': questions,
            'suggested_time_minutes': result.get('suggested_time_minutes', 30),
            'detected_topic': result.get('detected_topic', topic),
            'question_count': len(questions),
        }, status=status.HTTP_200_OK)

    except AIProviderUnavailableError as e:
        logger.warning("AI unavailable in parse_questions: %s", e)
        return Response(
            {
                'error': 'AI service temporarily unavailable. Verify OPENROUTER_API_KEY and provider quota, then retry.',
                'details': e.details,
                'type': type(e).__name__
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.error("Error in parse_questions: %s", e, exc_info=True)
        return Response(
            {'error': f'Failed to parse questions: {str(e)}', 'type': type(e).__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
