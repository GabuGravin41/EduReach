"""PDF past-paper extraction — diagram-aware, vision-based.

Ported from scripts/extract_engineering_exams.py into a live service. A worker
thread renders a PDF's pages, asks a vision model to extract every question
(with diagram bounding boxes), crops the diagrams, and builds an Assessment
attached to a unit.

Entry point: run_extraction_job(job_id) — runs in a daemon thread.
"""
import base64
import io
import json
import logging
import re
import uuid

import requests
from django.conf import settings
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

PDF_DPI = 150
JPEG_QUALITY = 80
MAX_PAGES_PER_CALL = 4
VISION_TIMEOUT = 120

_METADATA_PROMPT = """\
Look at this exam paper page and extract the header/cover metadata.
Return ONLY valid JSON — no markdown, no code fences.

{"institution": "or null", "unit_code": "e.g. EEE 203 or null",
 "unit_name": "or null", "paper_type": "End of Semester / CAT / Other",
 "year": "4-digit year string or null", "semester": "1, 2 or null"}
"""

_EXTRACTION_PROMPT = """\
You are an expert exam digitizer. Analyze ALL provided exam page images and
extract EVERY question and sub-question.

RULES:
1. Extract every question: Q1, Q1(a), Q2(i), etc. Do not skip any.
2. Render all math as LaTeX — inline $...$, display $$...$$.
3. If a question contains/references a circuit, graph, waveform, table or figure:
   - set has_diagram = true
   - diagram_bbox = [ymin, xmin, ymax, xmax] on a 0-1000 scale relative to the page
   - diagram_page = 0-based index of which provided image the diagram is on
   - diagram_description = what it shows
4. Marks: extract the number shown as [X marks] / (X marks).
5. Do NOT include instructions or cover-page text as questions.

Return ONLY a valid JSON array. If no questions, return [].
[
  {"question_number": "Q1(a)", "question_text": "Full text with $LaTeX$.",
   "marks": 5, "question_type": "calculation", "difficulty": "medium",
   "has_diagram": false, "diagram_description": null,
   "diagram_page": null, "diagram_bbox": null, "tags": ["KVL"]}
]
question_type: calculation | derivation | explanation | design | proof | sketch | true_false | mcq | other
"""


def _pdf_to_images(pdf_bytes: bytes):
    """Render every PDF page to a PIL RGB image."""
    import fitz  # PyMuPDF
    from PIL import Image

    doc = fitz.open(stream=pdf_bytes, filetype='pdf')
    mat = fitz.Matrix(PDF_DPI / 72, PDF_DPI / 72)
    images = []
    for page in doc:
        pix = page.get_pixmap(matrix=mat, alpha=False)
        images.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
    doc.close()
    return images


def _img_to_b64(img) -> str:
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=JPEG_QUALITY)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


def _vision_call(images, prompt: str, max_tokens: int = 3000) -> str:
    """Multimodal OpenRouter call. images: list of PIL images."""
    api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    if not api_key or api_key in {'dev-key-not-configured', 'dummy-key-for-build'}:
        raise RuntimeError('OPENROUTER_API_KEY not configured')

    url = getattr(settings, 'OPENROUTER_API_URL',
                  'https://openrouter.ai/api/v1/chat/completions')
    url = url.replace('api.openrouter.ai', 'openrouter.ai')
    model = getattr(settings, 'OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')

    content = [
        {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{_img_to_b64(im)}'}}
        for im in images
    ]
    content.append({'type': 'text', 'text': prompt})

    resp = requests.post(
        url,
        json={'model': model, 'messages': [{'role': 'user', 'content': content}],
              'max_tokens': max_tokens},
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        timeout=(8, VISION_TIMEOUT),
    )
    if resp.status_code >= 400:
        raise RuntimeError(f'Vision API error {resp.status_code}: {resp.text[:200]}')
    data = resp.json()
    return data.get('choices', [{}])[0].get('message', {}).get('content', '') or ''


def _parse_json(text: str):
    if not text:
        return None
    text = re.sub(r'```(?:json)?\s*', '', text).strip().rstrip('`').strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        for pat in (r'(\[[\s\S]*\])', r'(\{[\s\S]*\})'):
            m = re.search(pat, text)
            if m:
                try:
                    return json.loads(m.group(1))
                except json.JSONDecodeError:
                    continue
    return None


def _crop_diagram(page_img, bbox):
    """Crop [ymin, xmin, ymax, xmax] (0-1000 scale) from a page image → JPEG bytes."""
    try:
        w, h = page_img.size
        ymin, xmin, ymax, xmax = bbox
        left, right = max(0, int(xmin / 1000 * w)), min(w, int(xmax / 1000 * w))
        upper, lower = max(0, int(ymin / 1000 * h)), min(h, int(ymax / 1000 * h))
        if right - left < 10 or lower - upper < 10:
            return None
        buf = io.BytesIO()
        page_img.crop((left, upper, right, lower)).save(buf, format='JPEG', quality=JPEG_QUALITY)
        return buf.getvalue()
    except Exception as e:
        logger.warning('Diagram crop failed: %s', e)
        return None


def _extract_questions(images):
    """Run vision extraction over page batches; return a flat question list."""
    all_questions = []
    for start in range(0, len(images), MAX_PAGES_PER_CALL):
        batch = images[start:start + MAX_PAGES_PER_CALL]
        raw = _vision_call(batch, _EXTRACTION_PROMPT)
        parsed = _parse_json(raw)
        if isinstance(parsed, list):
            for q in parsed:
                if q.get('diagram_page') is not None:
                    try:
                        q['diagram_page'] = int(q['diagram_page']) + start
                    except (TypeError, ValueError):
                        q['diagram_page'] = None
            all_questions.extend(parsed)
    return all_questions


# Extraction question_type → Question.QuestionType value.
def _map_type(raw_type: str) -> str:
    t = (raw_type or '').lower()
    if t == 'mcq':
        return 'mcq'
    if t in ('true_false', 'truefalse'):
        return 'true_false'
    return 'essay'  # calculations, derivations, proofs — long-answer engineering


def run_extraction_job(job_id: int):
    """Worker-thread entry point. Renders the PDF, extracts questions, builds
    an Assessment attached to the job's unit. Updates the job row throughout."""
    from django.db import connection
    from .models import PaperExtractionJob
    from assessments.models import Assessment, Question, QuestionImage

    try:
        job = PaperExtractionJob.objects.get(pk=job_id)
    except PaperExtractionJob.DoesNotExist:
        return

    def _set(status=None, progress=None, error=None, assessment=None):
        if status:
            job.status = status
        if progress is not None:
            job.progress = progress
        if error is not None:
            job.error = error[:2000]
        if assessment is not None:
            job.assessment = assessment
        job.save()

    try:
        _set(status='processing', progress='Reading the PDF…')
        pdf_bytes = job.pdf.read()
        images = _pdf_to_images(pdf_bytes)
        if not images:
            raise RuntimeError('The PDF had no readable pages.')

        _set(progress=f'Extracting questions from {len(images)} page(s)…')
        questions = _extract_questions(images)
        if not questions:
            raise RuntimeError('No questions could be extracted from this PDF.')

        _set(progress='Building the paper…')
        unit = job.unit
        assessment = Assessment.objects.create(
            title=job.title or 'Imported past paper',
            topic=unit.name if unit else 'Past paper',
            description='Imported from a PDF past paper.',
            creator=job.user,
            assessment_type='exam',
            is_public=True,
            time_limit_minutes=120,
            unit=unit,
        )

        for idx, q in enumerate(questions):
            text = (q.get('question_text') or '').strip()
            if not text:
                continue
            try:
                points = int(q.get('marks') or 1)
            except (TypeError, ValueError):
                points = 1

            question = Question.objects.create(
                assessment=assessment,
                question_text=text,
                question_type=_map_type(q.get('question_type')),
                options=[],
                correct_answer='',
                points=max(1, points),
                order=idx,
                explanation='',
            )

            # Crop and attach the diagram, if any.
            if q.get('has_diagram') and q.get('diagram_bbox') and q.get('diagram_page') is not None:
                page_idx = q['diagram_page']
                if isinstance(page_idx, int) and 0 <= page_idx < len(images):
                    jpeg = _crop_diagram(images[page_idx], q['diagram_bbox'])
                    if jpeg:
                        filename = f'diagram_{uuid.uuid4().hex[:8]}.jpg'
                        img = QuestionImage(question=question, filename=filename)
                        img.image.save(filename, ContentFile(jpeg), save=True)
                        # Reference the image in the question text so it renders.
                        question.question_text = f'{text}\n\n![]({filename})'
                        question.save(update_fields=['question_text'])

        _set(status='done', progress='Done', assessment=assessment)
        logger.info('Extraction job %s done — assessment %s', job_id, assessment.id)

    except Exception as e:
        logger.exception('Extraction job %s failed', job_id)
        _set(status='failed', progress='', error=str(e))
    finally:
        connection.close()
