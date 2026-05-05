"""
Seed English math problems from OlympiadBench into the assessment pool.

Files processed (English, Maths only):
  OE_TO_maths_en_COMP.json   674 open-ended, text-only
  OE_MM_maths_en_COMP.json   150 open-ended, multimodal
  TP_TO_maths_en_COMP.json   503 theorem-proving, text-only
  TP_MM_maths_en_COMP.json    62 theorem-proving, multimodal
  Total: 1,389 problems

Paper structure (mirrors real olympiad papers):
  Each paper draws from ALL four subfields: Algebra, Geometry,
  Combinatorics, Number Theory.  The algorithm guarantees ≥1 problem
  per subfield per paper whenever supply allows, then fills remaining
  slots from the largest remaining pools.

  OE papers (EAMO level):  5 problems, 180 min
  TP papers (IMO/PAMO):    4 problems, 240 min

Difficulty mapping:
  OE files → comp_oe  (Competition, answer is numerical/expression)
  TP files → comp_tp  (Competition, answer is a full proof)

Usage:
  python manage.py seed_olympiad_bench
  python manage.py seed_olympiad_bench --admin-user admin@edureach.co.ke
  python manage.py seed_olympiad_bench --dry-run
"""

import ast
import json
import os
import re
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

# ── Constants ────────────────────────────────────────────────────────────────

DATASET_ROOT = Path(__file__).resolve().parents[4] / 'OlympiadBench_Dataset'
DATA_DIR     = DATASET_ROOT / 'data'
IMAGES_DIR   = DATASET_ROOT / 'images'

EN_FILES = [
    ('OE_TO_maths_en_COMP.json', 'comp_oe', False),
    ('OE_MM_maths_en_COMP.json', 'comp_oe', True),
    ('TP_TO_maths_en_COMP.json', 'comp_tp', False),
    ('TP_MM_maths_en_COMP.json', 'comp_tp', True),
]

SUBFIELDS = ['Algebra', 'Geometry', 'Number Theory', 'Combinatorics']

DIFF_LABEL = {
    'comp_oe': 'EAMO',
    'comp_tp': 'IMO/PAMO',
}

# (problems_per_paper, time_limit_minutes, competition_name)
TIER_CONFIG = {
    'comp_oe': (5, 180, 'EAMO'),
    'comp_tp': (4, 240, 'IMO/PAMO'),
}

# Solution-length thresholds for sub-tier tagging
SUB_TIER_THRESHOLDS = {
    'comp_oe': [(600, 'eamo_easy'), (1400, 'eamo_medium'), (None, 'eamo_hard')],
    'comp_tp': [(900, 'pamo_easy'), (2000, 'pamo_medium'), (None, 'imo_easy')],
}


def _solution_sub_tier(solution_text: str, difficulty: str) -> str:
    n = len(solution_text or '')
    for threshold, label in SUB_TIER_THRESHOLDS[difficulty]:
        if threshold is None or n < threshold:
            return label
    return SUB_TIER_THRESHOLDS[difficulty][-1][1]


def _build_mixed_papers(pools: dict, ppp: int) -> list:
    """
    Draw from per-subfield pools to create mixed papers.

    Each paper gets 1 problem from every non-empty subfield first,
    then fills remaining slots from the largest remaining pool.
    Returns a list of papers; each paper is a list of
    (row_dict, is_multimodal, subfield) tuples.
    """
    # Work on copies so caller's lists are unchanged
    work = {sf: list(rows) for sf, rows in pools.items() if rows}
    papers = []

    while any(work.values()):
        paper = []

        # Guarantee at least 1 per subfield while slots remain
        for sf in SUBFIELDS:
            if len(paper) >= ppp:
                break
            if work.get(sf):
                row, is_mm = work[sf].pop(0)
                paper.append((row, is_mm, sf))

        # Fill any remaining slots from whichever pool is largest
        while len(paper) < ppp:
            available = [(sf, lst) for sf, lst in work.items() if lst]
            if not available:
                break
            largest_sf = max(available, key=lambda x: len(x[1]))[0]
            row, is_mm = work[largest_sf].pop(0)
            paper.append((row, is_mm, largest_sf))

        if paper:
            papers.append(paper)

    return papers


class Command(BaseCommand):
    help = 'Seed OlympiadBench English math problems as mixed-subfield papers'

    def add_arguments(self, parser):
        parser.add_argument('--admin-user', default=None)
        parser.add_argument('--dry-run', action='store_true')

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

        # ── Load problems grouped by (difficulty, subfield) ──────────────────
        # pools[difficulty][subfield] = [(row, is_multimodal), ...]
        pools: dict[str, dict[str, list]] = {
            'comp_oe': {sf: [] for sf in SUBFIELDS},
            'comp_tp': {sf: [] for sf in SUBFIELDS},
        }

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
                pools[difficulty][subfield].append((row, is_multimodal))

        # ── Dry run ──────────────────────────────────────────────────────────
        if dry:
            self.stdout.write('')
            for difficulty in ('comp_oe', 'comp_tp'):
                ppp, time_limit, comp_name = TIER_CONFIG[difficulty]
                diff_label = DIFF_LABEL[difficulty]
                subfield_counts = {sf: len(pools[difficulty][sf]) for sf in SUBFIELDS}
                total = sum(subfield_counts.values())
                papers = _build_mixed_papers(pools[difficulty], ppp)
                self.stdout.write(
                    f'{diff_label} ({difficulty})  {total} problems → {len(papers)} mixed papers '
                    f'({ppp} problems/paper, {time_limit} min)'
                )
                for sf in SUBFIELDS:
                    self.stdout.write(f'    {sf}: {subfield_counts[sf]} problems')
                # Show the subfield composition of the first 3 papers
                self.stdout.write('  First 3 paper compositions:')
                for i, paper in enumerate(papers[:3], 1):
                    comp = ', '.join(f'{sf[:3]}' for _, _, sf in paper)
                    self.stdout.write(f'    Paper {i:03d}: [{comp}]')
                self.stdout.write('')
            return

        # ── Seed ─────────────────────────────────────────────────────────────
        total_created_assessments = 0
        total_created_questions   = 0
        total_created_images      = 0

        for difficulty in ('comp_oe', 'comp_tp'):
            diff_label = DIFF_LABEL[difficulty]
            ppp, time_limit, comp_name = TIER_CONFIG[difficulty]

            papers = _build_mixed_papers(pools[difficulty], ppp)
            self.stdout.write(
                f'\nSeeding {diff_label}: {len(papers)} mixed papers…'
            )

            for paper_idx, paper in enumerate(papers, start=1):
                subfields_in_paper = sorted({sf for _, _, sf in paper})
                title = f'{diff_label} Mixed Paper {paper_idx:03d}'

                if Assessment.objects.filter(creator=creator, title=title).exists():
                    continue

                sub_tiers = set()
                for row, _, _ in paper:
                    _, sol_text, _ = _parse_row(row)
                    sub_tiers.add(_solution_sub_tier(sol_text, difficulty))

                sf_short = ' · '.join(s[:3] for s in subfields_in_paper)
                description = (
                    f'{diff_label} level olympiad paper — {len(paper)} problems, '
                    f'{time_limit} minutes. Subfields: {", ".join(subfields_in_paper)}. '
                    f'Source: OlympiadBench (COMP).'
                )
                tags = (
                    ['olympiad', 'math', 'mixed', difficulty.replace('_', '-')]
                    + [sf.lower().replace(' ', '_') for sf in subfields_in_paper]
                    + sorted(sub_tiers)
                )

                assessment = Assessment.objects.create(
                    title=title,
                    topic='Olympiad',
                    description=description,
                    creator=creator,
                    time_limit_minutes=time_limit,
                    image_upload_grace_minutes=10,
                    assessment_type=Assessment.AssessmentType.EXAM,
                    is_public=True,
                    allow_students_see_results=True,
                    difficulty_level=difficulty,
                    competition_name=comp_name,
                    source_attribution='OlympiadBench Dataset',
                    source_url='https://huggingface.co/datasets/GAIR/OlympiadBench',
                    tags=tags,
                )
                total_created_assessments += 1

                for q_order, (row, is_multimodal, subfield) in enumerate(paper, start=1):
                    question_text, sol_text, final_ans = _parse_row(row)
                    context = row.get('context', '') or ''
                    if context and context.lower() != 'none':
                        question_text = f'**Context:** {context}\n\n{question_text}'

                    # Prefix with subfield label so students know what they're solving
                    question_text = f'**[{subfield}]**\n\n{question_text}'

                    q_type = (
                        Question.QuestionType.SHORT_ANSWER
                        if difficulty == 'comp_oe' and row.get('answer_type') in ('Numerical', 'Expression')
                        else Question.QuestionType.ESSAY
                    )

                    q_imgs: list[tuple[str, str]] = []
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

                    for img_filename, img_abs_path in q_imgs:
                        if not os.path.exists(img_abs_path):
                            continue
                        with open(img_abs_path, 'rb') as img_f:
                            img_bytes = img_f.read()
                        qi = QuestionImage(question=question, filename=img_filename)
                        qi.image.save(img_filename, ContentFile(img_bytes), save=True)
                        total_created_images += 1

            self.stdout.write(
                self.style.SUCCESS(f'  {diff_label}: {paper_idx} papers seeded.')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. Created {total_created_assessments} assessments, '
                f'{total_created_questions} questions, {total_created_images} images.'
            )
        )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_row(row: dict) -> tuple[str, str, str]:
    question = row.get('question', '') or ''
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
