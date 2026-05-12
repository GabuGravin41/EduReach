"""
Management command: rename_assessments
---------------------------------------
Finds assessments with auto-generated filenames (e.g. "20210225_080022.jpg",
"20210225_075649.jpg" or any title that looks like a raw filename/timestamp)
and uses AI to infer a proper human-readable title and description from the
question content inside.

Usage:
    python manage.py rename_assessments               # dry run
    python manage.py rename_assessments --apply       # actually rename
    python manage.py rename_assessments --apply --limit 10   # batch of 10
"""

import re
import json
import logging

from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)

# Matches filenames like "20210225_080022.jpg" or "20210225_075649"
FILENAME_PATTERN = re.compile(r'^\d{8}[_\-]\d{6}(\.jpg|\.jpeg|\.png)?$', re.IGNORECASE)


def _looks_like_filename(title: str) -> bool:
    t = title.strip()
    if FILENAME_PATTERN.match(t):
        return True
    # Also catch things like "YYYYMMDD_HHMMSS.jpg — <unit>" if user reran with partial fix
    if re.match(r'^\d{8}', t):
        return True
    return False


def _ask_ai(questions_preview: str) -> dict:
    """Ask OpenRouter to infer a proper assessment title/description from question text."""
    from ai_service.views import call_openrouter  # noqa: PLC0415

    prompt = f"""You are given a set of exam/assessment questions. Based on the content of these questions, generate:
1. A concise, professional assessment title (max 80 characters). Format: "[Subject/Unit Code] — [Topic]" e.g. "ECU 202 — Differential Equations" or "Nursing — Drug Dosage Calculations"
2. A one-sentence description (max 160 characters) summarising what the assessment covers.
3. A list of 5-8 relevant topic tags (lowercase, comma-separated).

Questions:
---
{questions_preview}
---

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{{"title": "...", "description": "...", "tags": ["tag1", "tag2", ...]}}"""

    try:
        result = call_openrouter(
            prompt,
            model_name='google/gemini-2.0-flash-001',
            max_tokens=300,
        )
        text = result.text.strip()
        # Strip markdown fences if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as exc:
        logger.error('AI rename failed: %s', exc)
        return {}


class Command(BaseCommand):
    help = 'Rename assessments that have auto-generated filenames using AI.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', default=False,
                            help='Actually rename (default is dry run).')
        parser.add_argument('--limit', type=int, default=0,
                            help='Max number of assessments to rename (0 = all).')

    def handle(self, *args, **options):
        from assessments.models import Assessment, Question  # noqa: PLC0415

        apply = options['apply']
        limit = options['limit']

        if not apply:
            self.stdout.write(self.style.WARNING(
                'DRY RUN — pass --apply to actually rename assessments.\n'
            ))

        # Find all assessments that look like they were named from filenames
        candidates = [
            a for a in Assessment.objects.all()
            if _looks_like_filename(a.title)
        ]

        if limit:
            candidates = candidates[:limit]

        self.stdout.write(f'Found {len(candidates)} assessments to rename.')

        renamed = failed = skipped = 0

        for assessment in candidates:
            # Build a preview of up to 4 questions
            questions = Question.objects.filter(assessment=assessment).order_by('order')[:4]
            if not questions.exists():
                self.stdout.write(f'  [SKIP] "{assessment.title}" — no questions')
                skipped += 1
                continue

            preview_parts = []
            for i, q in enumerate(questions, 1):
                text = q.question_text.strip()[:300]
                preview_parts.append(f'Q{i}: {text}')
            preview = '\n'.join(preview_parts)

            if not apply:
                self.stdout.write(f'  [DRY] Would rename: "{assessment.title}"')
                self.stdout.write(f'        Preview: {preview[:100]}...')
                continue

            self.stdout.write(f'  Renaming "{assessment.title}"...')
            result = _ask_ai(preview)

            if not result.get('title'):
                self.stdout.write(f'    [FAIL] AI returned nothing useful — skipping')
                failed += 1
                continue

            old_title = assessment.title
            new_title = result['title'][:200]
            # Disambiguate if a duplicate title exists for the same creator
            from assessments.models import Assessment as Ass  # noqa: PLC0415
            suffix = 2
            candidate = new_title
            while Ass.objects.filter(creator=assessment.creator, title=candidate).exclude(pk=assessment.pk).exists():
                candidate = f'{new_title} ({suffix})'
                suffix += 1
            assessment.title = candidate
            if result.get('description'):
                assessment.description = result['description']
            if result.get('tags'):
                existing = set(t.lower() for t in (assessment.tags or []))
                new_tags = set(t.lower().strip() for t in result['tags'])
                assessment.tags = sorted(existing | new_tags)
            assessment.save()

            self.stdout.write(self.style.SUCCESS(
                f'    ✓ "{old_title}"  →  "{assessment.title}"'
            ))
            renamed += 1

        self.stdout.write('')
        if apply:
            self.stdout.write(self.style.SUCCESS(
                f'Done — renamed: {renamed}, failed: {failed}, skipped: {skipped}'
            ))
        else:
            self.stdout.write(self.style.NOTICE(
                f'Dry run — {len(candidates)} would be renamed. Run with --apply to proceed.'
            ))
