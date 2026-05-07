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

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel, GenerationConfig
    _vertexai_available = True
except ImportError:
    vertexai = None
    GenerativeModel = None
    GenerationConfig = None
    _vertexai_available = False

_vertex_initialized = False

logger = logging.getLogger(__name__)


class AIProviderUnavailableError(RuntimeError):
    """Raised when all configured AI providers fail."""

    def __init__(self, details=None):
        self.details = details or []
        message = "No AI provider available."
        if self.details:
            message = f"{message} " + " | ".join(self.details)
        super().__init__(message)


def _init_vertex():
    """Initialize Vertex AI once per process. Returns True if ready."""
    global _vertex_initialized
    if _vertex_initialized:
        return True
    if not _vertexai_available:
        return False
    project = getattr(settings, 'VERTEX_AI_PROJECT', None)
    if not project:
        return False
    try:
        location = getattr(settings, 'VERTEX_AI_LOCATION', 'us-central1')
        vertexai.init(project=project, location=location)
        _vertex_initialized = True
        logger.info("Vertex AI initialized: project=%s location=%s", project, location)
        return True
    except Exception as e:
        logger.warning("Vertex AI init failed: %s", e)
        return False


def call_vertex_ai(
    prompt: str,
    max_tokens: int = 400,
    read_timeout_override: float | None = None,
):
    """Call Gemini via Vertex AI (uses Google Cloud credits)."""
    if not _init_vertex():
        raise RuntimeError('Vertex AI not configured or unavailable')

    model_name = getattr(settings, 'VERTEX_AI_MODEL', 'gemini-2.0-flash-001')
    read_timeout = (
        read_timeout_override
        if read_timeout_override is not None
        else getattr(settings, 'VERTEX_AI_READ_TIMEOUT_SECONDS', 60)
    )

    model = GenerativeModel(model_name)
    generation_config = GenerationConfig(max_output_tokens=max_tokens)

    # Vertex AI Python SDK is synchronous; wrap in a basic timeout check
    import threading
    result_holder = [None]
    error_holder = [None]

    def _call():
        try:
            response = model.generate_content(
                prompt,
                generation_config=generation_config,
            )
            result_holder[0] = response.text
        except Exception as e:
            error_holder[0] = e

    t = threading.Thread(target=_call, daemon=True)
    t.start()
    t.join(timeout=read_timeout)

    if t.is_alive():
        raise RuntimeError(f'Vertex AI request timed out after {read_timeout}s')
    if error_holder[0]:
        raise error_holder[0]

    class _R:
        def __init__(self, text):
            self.text = text

    return _R(result_holder[0] or '')


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
    """Unified AI entry point.

    Provider priority:
      1. Vertex AI — when VERTEX_AI_PROJECT is set in settings (uses Google Cloud credits)
      2. OpenRouter — always available as fallback (OPENROUTER_API_KEY required)

    prefer_openrouter=True forces OpenRouter directly (skips Vertex AI).
    """
    provider_failures = []

    def _short_error_text(error: Exception, max_chars: int = 240) -> str:
        text = str(error).replace('\n', ' ').strip()
        return text[:max_chars] + ('...' if len(text) > max_chars else '')

    vertex_project = getattr(settings, 'VERTEX_AI_PROJECT', None)
    use_vertex_first = vertex_project and not prefer_openrouter

    if use_vertex_first:
        try:
            resp = call_vertex_ai(
                prompt,
                max_tokens=max_tokens,
                read_timeout_override=openrouter_read_timeout,
            )
            logger.debug("AI call served by Vertex AI")
            return resp.text
        except Exception as e:
            logger.warning("Vertex AI call failed, falling back to OpenRouter: %s", e)
            provider_failures.append(f'Vertex AI error: {_short_error_text(e)}')

    try:
        resp = call_openrouter(
            prompt,
            max_tokens=max_tokens,
            read_timeout_override=openrouter_read_timeout,
        )
        logger.debug("AI call served by OpenRouter")
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


def _safe_parse_quiz_json(text: str):
    """Parse quiz JSON from AI response, handling markdown wrappers and stray text."""
    cleaned = text.strip()
    # Strip markdown code fences
    for fence in ("```json", "```"):
        if cleaned.startswith(fence):
            cleaned = cleaned[len(fence):]
            break
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        # Find the first complete {...} or [...] block in case of preamble text
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
        if match:
            try:
                return json.loads(match.group(1))
            except (json.JSONDecodeError, ValueError):
                pass
    return None


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
        try:
            num_questions = int(request.data.get('num_questions', 5))
        except (TypeError, ValueError):
            num_questions = 5
        num_questions = max(1, min(num_questions, 50))
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

        topic_only = (request.data.get('topic') or '').strip()
        assessment_title = (request.data.get('title') or topic_only or '').strip()

        combined_context_parts = []
        if transcript:
            combined_context_parts.append(transcript)
        if pdf_context:
            combined_context_parts.append(f"[PDF Context]\n{pdf_context}")
        combined_context = "\n\n---\n\n".join(combined_context_parts).strip()

        # Topic-only mode: no transcript or PDF — generate from topic name alone
        if not combined_context and topic_only:
            combined_context = (
                f"TOPIC-ONLY MODE: Generate {num_questions} questions about \"{topic_only}\".\n"
                f"Draw on standard academic knowledge of this subject. "
                f"Vary question depth: include factual recall, conceptual understanding, and application. "
                f"Title: {assessment_title or topic_only}"
            )

        # Bound total context to keep generation latency predictable.
        # For larger question sets, use less context to leave more room for output.
        max_context_chars = 8000 if num_questions > 5 else 12000
        if len(combined_context) > max_context_chars:
            combined_context = combined_context[:max_context_chars]

        if not combined_context:
            return Response(
                {'error': 'Provide a topic, transcript text, or upload a PDF context file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Chunked generation strategy ──
        # For large question sets or long contexts, generate in batches of 5.
        # Each batch gets a different slice of the context so all material is covered.
        BATCH_SIZE = 5

        total_batches = max(1, (num_questions + BATCH_SIZE - 1) // BATCH_SIZE)
        context_len = len(combined_context)
        max_context_per_batch = 8000

        # Create context chunks — each batch gets a different slice of the material
        context_chunks = []
        if context_len <= max_context_per_batch:
            context_chunks = [combined_context] * total_batches
        else:
            chunk_size = min(max_context_per_batch, context_len // total_batches + 500)
            for i in range(total_batches):
                start = int(i * (context_len - chunk_size) / max(total_batches - 1, 1)) if total_batches > 1 else 0
                end = start + chunk_size
                context_chunks.append(combined_context[start:end])

        long_read = getattr(settings, 'OPENROUTER_READ_TIMEOUT_LONG_SECONDS', 90)
        prompt_continuation = '''IMPORTANT for valid JSON: Inside every JSON string value, escape backslashes by doubling them (e.g. write \\\\mathbb instead of \\mathbb).'''

        all_questions = []
        batch_errors = []

        for batch_idx in range(total_batches):
            batch_count = min(BATCH_SIZE, num_questions - len(all_questions))
            if batch_count <= 0:
                break

            batch_context = context_chunks[batch_idx] if batch_idx < len(context_chunks) else context_chunks[-1]

            avoid_clause = ""
            if all_questions:
                existing_qs = "; ".join([q.get("question", "")[:60] for q in all_questions[-5:]])
                avoid_clause = f"\n\nDo NOT repeat these questions you already generated: {existing_qs}"

            prompt = f"""You are generating assessment questions from the following study material. Read it carefully — it may be an exam paper, lecture notes, textbook content, or worked examples.

CONTENT:
{batch_context}

Generate exactly {batch_count} {difficulty} difficulty questions.{avoid_clause}

CRITICAL RULES:

RULE 1 — FORMAT MIRRORING (most important):
Analyse the structure of the content above. If it is an exam paper or structured problem set, mirror its format exactly:
- If it has multi-part questions (i, ii, iii), reproduce that structure
- If it has data tables, those exact tables must appear in your questions
- If it uses a specific notation or formula style, use the same
- If problems say "using Method X, find Y for the following data", keep that phrasing
- Each question should feel like it came from the same exam paper, not a generic quiz

RULE 2 — USE EXACT DATA:
Never invent or substitute numbers. The specific values in the content (data points, tables, integrals, polynomials, coefficients) must appear in your questions verbatim.

RULE 3 — QUESTION TYPE by subject:
- Computation, mathematics, engineering, science → "short_answer" with a specific numerical/algebraic answer
- Definitions, concepts, theory → "mcq" with 4 meaningful options
- NEVER use true/false for computational or derivation problems
- If the source is an exam paper with long-form problems, use "short_answer" for all of them

RULE 4 — COMPLETENESS:
Each short_answer question must include all data the student needs to solve it (full tables, limits, formulas). The correct_answer must be the exact numerical or algebraic result. The explanation must show the full working.

RULE 5 — LaTeX: $...$ inline, $$...$$ block. Use for all mathematics.

Return ONLY valid JSON:
{{"questions": [
  {{
    "question": "Using Newton's divided difference formula with $x$: [1,3,6,11] and $f(x)$: [4,32,224,1344], find the divided difference $f[1,3]$.",
    "type": "short_answer",
    "correct_answer": "14",
    "explanation": "$$f[1,3] = \\frac{{f(3)-f(1)}}{{3-1}} = \\frac{{32-4}}{{2}} = 14$$"
  }},
  {{
    "question": "Sample multiple choice question?",
    "type": "mcq",
    "options": ["Correct Option", "Wrong Option 1", "Wrong Option 2", "Wrong Option 3"],
    "correct_answer": "Correct Option",
    "explanation": "Explanation of why this is correct."
  }}
]}}"""

            try:
                response_text = call_ai(
                    prompt + prompt_continuation,
                    max_tokens=4000,
                    prefer_openrouter=True,
                    openrouter_read_timeout=long_read,
                )
                
                batch_data = _safe_parse_quiz_json(response_text)
                if batch_data is None:
                    raise ValueError("AI returned non-JSON content")

                if isinstance(batch_data, dict):
                    batch_questions = batch_data.get('questions', [])
                elif isinstance(batch_data, list):
                    batch_questions = batch_data
                else:
                    batch_questions = []

                # Post-processing to enforce validity
                valid_questions = []
                for q in batch_questions:
                    q_type = q.get('type', 'mcq')
                    options = q.get('options', [])
                    
                    if q_type == 'mcq' and (not isinstance(options, list) or len(options) < 2):
                        # Fix missing choices instead of dropping the question
                        ans = q.get('correct_answer', 'Correct Answer')
                        q['options'] = [
                            ans,
                            "None of the above",
                            "All of the above",
                            "Not enough information"
                        ]
                    if q_type == 'true_false' and not options:
                        q['options'] = ['True', 'False']
                    valid_questions.append(q)

                all_questions.extend(valid_questions)
            except Exception as batch_err:
                logger.warning("Quiz batch %d/%d failed: %s", batch_idx + 1, total_batches, batch_err)
                batch_errors.append(f"Batch {batch_idx + 1}: {str(batch_err)[:100]}")

        if not all_questions:
            _increment_ai_usage(request.user)
            error_detail = '; '.join(batch_errors) if batch_errors else 'AI returned no parseable questions.'
            return Response(
                {'error': f'Failed to generate quiz: {error_detail}', 'raw_response': ''},
                status=status.HTTP_200_OK
            )

        _increment_ai_usage(request.user)

        payload = {'questions': all_questions}
        if pdf_pages:
            payload['pdf_context_pages_used'] = pdf_pages
        if total_batches > 1:
            payload['batches_used'] = total_batches
        return Response(payload, status=status.HTTP_200_OK)

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




def _build_performance_snippet(user) -> str:
    """Return a compact learner-profile string to personalise Edu's responses.

    Keeps the token budget low: at most ~200 chars injected.
    Returns empty string if nothing useful is available.
    """
    try:
        from assessments.models import UserAttempt
        attempts = (
            UserAttempt.objects
            .filter(user=user, status='graded')
            .select_related('assessment')
            .order_by('-submitted_at')[:20]
        )
        if not attempts:
            return ''

        topic_scores: dict[str, list[float]] = {}
        for a in attempts:
            topic = (a.assessment.topic or '').strip()
            if not topic:
                continue
            topic_scores.setdefault(topic, []).append(a.percentage)

        if not topic_scores:
            return ''

        lines = []
        for topic, scores in topic_scores.items():
            avg = sum(scores) / len(scores)
            label = 'struggling' if avg < 50 else ('improving' if avg < 75 else 'strong')
            lines.append(f"{topic}: {label} ({avg:.0f}%)")

        # Sort weakest first so Edu can prioritise
        lines.sort(key=lambda l: float(l.split('(')[1].rstrip('%)') or 100))
        top = lines[:5]  # cap at 5 topics to stay lean

        learner_type = getattr(user, 'learner_type', '') or ''
        profile_note = f"Learner type: {learner_type}. " if learner_type else ''
        return f"Student performance profile — {profile_note}Recent topics: {'; '.join(top)}. Tailor explanations to their level and suggest extra practice on weak areas."
    except Exception:
        return ''


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

        # Deep-solve mode: detect multi-part problems (numbered lists, lettered sub-parts)
        import re as _re_check
        is_deep_solve = (
            len(_re_check.findall(r'(?m)^\s*(?:\d+[\.\)]|[a-d][\.\)])', message)) >= 2
            or message.count('\n') >= 4
        )
        
        # Construct the full prompt with context and system instructions
        system_instruction = """You are Edu, an expert AI tutor on the EduReach platform. You help students genuinely understand and solve problems — and you can take actions on the platform on their behalf.

CORE RULES — follow these without exception:
1. When a student pastes problems, questions, notes, exam content, or any study material — engage with it DIRECTLY and IMMEDIATELY.
2. When asked to solve a problem, solve it. Show full working. Be thorough.
3. When asked to create an assessment or quiz — do it. Emit an action tag (see ACTIONS below) AND briefly confirm what you are doing.
4. NEVER tell a student to navigate somewhere themselves. If they need to go somewhere, take them there via an action.
5. If the student is frustrated, acknowledge it once and immediately do what they asked.
6. Response length must match request complexity — a numerical analysis problem deserves a full solution.

ACTIONS — you can control the platform by appending ONE action tag at the very end of your response:

<action>{"type": "navigate", "view": "assessments"}</action>
<action>{"type": "navigate", "view": "study_groups"}</action>
<action>{"type": "navigate", "view": "dashboard"}</action>
<action>{"type": "navigate", "view": "analytics"}</action>
<action>{"type": "create_assessment", "title": "Assessment title here", "num_questions": 10}</action>

When to use actions:
- User says "create an assessment / quiz / exam from this" → emit create_assessment with a relevant title and question count (default 10, max 15)
- User says "take me to assessments / show me my exams" → emit navigate to assessments
- User asks to go anywhere on the platform → emit navigate
- ONLY emit ONE action per response, at the very end, after your text

For mathematical / technical content: use LaTeX ($...$ inline, $$...$$ block).
When quizzing the student: ask questions only — no answers until they attempt."""

        # Inject a compact learner performance snapshot into the system prompt
        perf_snippet = _build_performance_snippet(request.user)
        if perf_snippet:
            system_instruction += f"\n\n{perf_snippet}"

        optimized_context = context
        if optimized_context and len(optimized_context) > 12000:
            optimized_context = optimized_context[:12000]

        # Include conversation history for context continuity
        history = request.data.get('history', [])
        history_text = ''
        if history and len(history) > 1:
            history_lines = []
            for m in history[-8:]:  # last 8 turns
                role_label = 'Student' if m.get('role') == 'user' else 'Edu'
                history_lines.append(f"{role_label}: {m.get('content', '')[:600]}")
            history_text = '\n'.join(history_lines)

        parts = [system_instruction]
        if optimized_context:
            parts.append(f"Learning Context:\n{optimized_context}")
        if history_text:
            parts.append(f"Conversation so far:\n{history_text}")
        parts.append(f"Student: {message}")
        full_prompt = '\n\n'.join(parts)

        max_tokens = 2000 if is_deep_solve else (1200 if wants_detailed else 800)
        response_text = call_ai(full_prompt, max_tokens=max_tokens)
        _increment_ai_usage(request.user)

        # Parse action tag from response
        import re as _re
        action_data = None
        action_match = _re.search(r'<action>(.*?)</action>', response_text, _re.DOTALL)
        if action_match:
            try:
                import json as _json
                action_data = _json.loads(action_match.group(1).strip())
                # Strip action tag from visible response
                response_text = _re.sub(r'\s*<action>.*?</action>', '', response_text, flags=_re.DOTALL).strip()
            except Exception:
                action_data = None

        payload = {'response': response_text}
        if action_data:
            payload['action'] = action_data

        return Response(payload, status=status.HTTP_200_OK)
    
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
