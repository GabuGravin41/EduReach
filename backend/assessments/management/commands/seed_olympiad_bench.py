"""
Seed English math problems from OlympiadBench into the assessment pool.

Files processed (English, Maths only):
  OE_TO_maths_en_COMP.json   674 open-ended, text-only
  OE_MM_maths_en_COMP.json   150 open-ended, multimodal
  TP_TO_maths_en_COMP.json   503 theorem-proving, text-only
  TP_MM_maths_en_COMP.json    62 theorem-proving, multimodal
  Total: 1,389 problems

Grouping: 5 problems per assessment, grouped by subfield (Geometry, Algebra,
Combinatorics, Number Theory).

Difficulty mapping:
  OE files → comp_oe  (Competition, answer is numerical/expression)
  TP files → comp_tp  (Competition, answer is a full proof)

Image format in dataset: <img_XXXX> → stored as ![](img_XXXX.jpg) in
question_text / explanation, and saved to media/question_images/.

Usage:
  python manage.py seed_olympiad_bench
  python manage.py seed_olympiad_bench --admin-user admin@edureach.co.ke
  python manage.py seed_olympiad_bench --dry-run
  python manage.py seed_olympiad_bench --problems-per-paper 10
"""

import ast
import io
import json
import os
import re
import shutil
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

# ── Constants ────────────────────────────────────────────────────────────────

DATASET_ROOT = Path(__file__).resolve().parents[4] / 'OlympiadBench_Dataset'
DATA_DIR     = DATASET_ROOT / 'data'
IMAGES_DIR   = DATASET_ROOT / 'images'

# Only English math files
EN_FILES = [
    ('OE_TO_maths_en_COMP.json', 'comp_oe', False),
    ('OE_MM_maths_en_COMP.json', 'comp_oe', True),
    ('TP_TO_maths_en_COMP.json', 'comp_tp', False),
    ('TP_MM_maths_en_COMP.json', 'comp_tp', True),
]

SUBFIELDS = ['Geometry', 'Algebra', 'Combinatorics', 'Number Theory']

DIFF_LABEL = {
    'comp_oe': 'Competition OE',
    'comp_tp': 'Proof',
}


class Command(BaseCommand):
    help = 'Seed OlympiadBench English math problems into the assessment pool'

    def add_arguments(self, parser):
        parser.add_argument('--admin-user', default=None)
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--problems-per-paper', type=int, default=5)

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from assessments.models import Assessment, Question, QuestionImage

        User = get_user_model()

        # ── Resolve creator ──────────────────────────────────────────────────
        email = options['admin_user']
        if email:
            try:
                creator = User.objects.get(email=email)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"User '{email}' not found."))
                return
        else:
            creator = User.objects.filter(is_superuser=True).order_by('id').first()
            if not creator:
                self.stderr.write(self.style.ERROR('No superuser found. Pass --admin-user.'))
                return

        self.stdout.write(f'Creator : {creator.email}')
        self.stdout.write(f'Dataset : {DATASET_ROOT}')

        dry = options['dry_run']
        ppp = options['problems_per_paper']  # problems per paper

        # ── Load all records grouped by (subfield, difficulty) ───────────────
        buckets: dict[tuple, list] = {}   # (subfield, difficulty) → [row, ...]

        for filename, difficulty, is_multimodal in EN_FILES:
            filepath = DATA_DIR / filename
            if not filepath.exists():
                self.stderr.write(self.style.WARNING(f'  Missing: {filepath}'))
                continue

            with open(filepath, encoding='utf-8') as f:
                records = json.load(f)

            for row in records:
                subfield = row.get('subfield', '')
                if subfield not in SUBFIELDS:
                    continue
                key = (subfield, difficulty)
                buckets.setdefault(key, []).append((row, is_multimodal))

        total_problems = sum(len(v) for v in buckets.values())
        self.stdout.write(f'Problems: {total_problems} across {len(buckets)} buckets')

        if dry:
            for (sf, diff), rows in sorted(buckets.items()):
                papers = _ceil_div(len(rows), ppp)
                self.stdout.write(f'  {sf:20s} {diff:10s}  {len(rows):4d} problems → {papers} papers')
            return

        # ── Seed ─────────────────────────────────────────────────────────────
        total_created_assessments = 0
        total_created_questions   = 0
        total_created_images      = 0

        for (subfield, difficulty), rows in sorted(buckets.items()):
            diff_label = DIFF_LABEL.get(difficulty, difficulty)
            # Batch into papers of ppp
            for paper_idx, batch_start in enumerate(range(0, len(rows), ppp), start=1):
                batch = rows[batch_start: batch_start + ppp]

                title = f'{subfield} — {diff_label} Set {paper_idx:03d}'

                # Skip if already seeded
                if Assessment.objects.filter(creator=creator, title=title).exists():
                    continue

                description = (
                    f'{subfield} practice — {diff_label.lower()} level. '
                    f'{len(batch)} problems. Source: OlympiadBench (COMP).'
                )
                tags = ['olympiad', 'math', subfield.lower().replace(' ', '_'), subfield,
                        difficulty.replace('_', '-')]

                time_limit = 30 * len(batch)  # 30 min per problem

                assessment = Assessment.objects.create(
                    title=title,
                    topic=subfield,
                    description=description,
                    creator=creator,
                    time_limit_minutes=time_limit,
                    image_upload_grace_minutes=10,
                    assessment_type=Assessment.AssessmentType.EXAM,
                    is_public=True,
                    allow_students_see_results=True,
                    difficulty_level=difficulty,
                    source_attribution='OlympiadBench Dataset',
                    source_url='https://huggingface.co/datasets/GAIR/OlympiadBench',
                    tags=tags,
                )
                total_created_assessments += 1

                for q_order, (row, is_multimodal) in enumerate(batch, start=1):
                    question_text, sol_text, final_ans = _parse_row(row)
                    context = row.get('context', '') or ''
                    if context and context.lower() != 'none':
                        question_text = f'**Context:** {context}\n\n{question_text}'

                    q_type = (
                        Question.QuestionType.SHORT_ANSWER
                        if difficulty == 'comp_oe' and row.get('answer_type') in ('Numerical', 'Expression')
                        else Question.QuestionType.ESSAY
                    )

                    q_imgs: list[tuple[str, str]] = []   # (filename, abs_path)
                    if is_multimodal:
                        question_text, q_imgs_q = _replace_img_tags(question_text)
                        sol_text, q_imgs_s      = _replace_img_tags(sol_text)
                        q_imgs = list({name: path for name, path in q_imgs_q + q_imgs_s}.items())

                    question = Question.objects.create(
                        assessment=assessment,
                        question_text=question_text,
                        question_type=q_type,
                        correct_answer=final_ans or ('See proof.' if difficulty == 'comp_tp' else ''),
                        explanation=sol_text,
                        points=7 if difficulty == 'comp_tp' else 4,
                        order=q_order,
                        source_url=assessment.source_url,
                    )
                    total_created_questions += 1

                    # Save images
                    for img_filename, img_abs_path in q_imgs:
                        if not os.path.exists(img_abs_path):
                            continue
                        with open(img_abs_path, 'rb') as img_f:
                            img_bytes = img_f.read()
                        qi = QuestionImage(question=question, filename=img_filename)
                        qi.image.save(img_filename, ContentFile(img_bytes), save=True)
                        total_created_images += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'  {subfield:20s} {difficulty:10s} '
                    f'→ {_ceil_div(len(rows), ppp)} papers'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. Created {total_created_assessments} assessments, '
                f'{total_created_questions} questions, {total_created_images} images.'
            )
        )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_row(row: dict) -> tuple[str, str, str]:
    """Return (question_text, solution_text, final_answer)."""
    question = row.get('question', '') or ''

    # solution and final_answer are stored as Python-list strings
    sol_raw = row.get('solution', '') or ''
    fa_raw  = row.get('final_answer', '') or ''

    try:
        sol_list = ast.literal_eval(sol_raw) if sol_raw and sol_raw != 'None' else []
        solution = '\n\n---\n\n'.join(sol_list) if sol_list else ''
    except Exception:
        solution = sol_raw

    try:
        fa_list = ast.literal_eval(fa_raw) if fa_raw and fa_raw not in ('None', '') else []
        final_answer = fa_list[0] if fa_list else ''
    except Exception:
        final_answer = fa_raw

    return question, solution, final_answer


def _replace_img_tags(text) -> tuple[str, list[tuple[str, str]]]:
    """
    Replace every <img_XXXX> in text with ![](img_XXXX.jpg).
    Returns (new_text, [(filename, abs_path), ...]).
    Handles None or non-string gracefully.
    """
    if not isinstance(text, str):
        return (text or ''), []

    refs: list[tuple[str, str]] = []
    seen: set[str] = set()

    def replacer(m: re.Match) -> str:
        num      = m.group(1)
        filename = f'img_{num}.jpg'
        abs_path = str(IMAGES_DIR / filename)
        if filename not in seen:
            refs.append((filename, abs_path))
            seen.add(filename)
        return f'![]({filename})'

    new_text = re.sub(r'<img_(\d+)>', replacer, text)
    return new_text, refs


def _ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b
