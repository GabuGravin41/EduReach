"""
Import engineering past-paper questions as Assessments (same pattern as Olympiad/KCSE).

Each paper (source_file) becomes one Assessment.
Each question within that paper becomes one Question.

Usage:
    python manage.py import_engineering_questions \
        --csv /path/to/engineering_questions.csv \
        --diagrams /path/to/dataset/diagrams/

    # Dry run
    python manage.py import_engineering_questions --csv ... --dry-run

    # Update existing (default: skip duplicates)
    python manage.py import_engineering_questions --csv ... --update
"""

import csv
import re
import shutil
from collections import defaultdict
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError


def parse_bool(val): return str(val).strip().lower() in ('true', '1', 'yes')
def parse_int(val):
    try: return int(str(val).strip())
    except: return None
def parse_tags(val):
    if not val or not val.strip(): return []
    return [t.strip() for t in val.split(',') if t.strip()]


class Command(BaseCommand):
    help = 'Import engineering past papers from CSV into the Assessment pool'

    def add_arguments(self, parser):
        parser.add_argument('--csv',      required=True, help='Path to engineering_questions.csv')
        parser.add_argument('--diagrams', default='',    help='Path to diagrams/ folder')
        parser.add_argument('--admin-user', default='',  help='Email of creator account')
        parser.add_argument('--dry-run',  action='store_true')
        parser.add_argument('--update',   action='store_true', help='Update existing assessments')

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from assessments.models import Assessment, Question, QuestionImage

        User = get_user_model()

        # ── Creator ──────────────────────────────────────────────────────────
        email = options['admin_user']
        if email:
            try:
                creator = User.objects.get(email=email)
            except User.DoesNotExist:
                raise CommandError(f"User '{email}' not found.")
        else:
            creator = User.objects.filter(is_superuser=True).order_by('id').first()
            if not creator:
                raise CommandError('No superuser found. Pass --admin-user.')

        csv_path = Path(options['csv'])
        if not csv_path.exists():
            raise CommandError(f"CSV not found: {csv_path}")

        diagrams_dir = Path(options['diagrams']) if options['diagrams'] else None
        dry_run   = options['dry_run']
        do_update = options['update']

        # ── Read CSV and group by source_file (= one paper per assessment) ───
        with open(csv_path, newline='', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))

        papers = defaultdict(list)
        for row in rows:
            src = row.get('source_file', '').strip()
            if src:
                papers[src].append(row)

        self.stdout.write(f"Creator  : {creator.email}")
        self.stdout.write(f"Papers   : {len(papers)}")
        self.stdout.write(f"Questions: {len(rows)}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no DB writes\n"))

        created = updated = skipped = failed = 0

        for source_file, questions in sorted(papers.items()):
            # Infer metadata from first row that has it
            meta = {}
            for q in questions:
                for field in ('unit_code','unit_name','institution','year','semester','paper_type'):
                    if not meta.get(field) and q.get(field,'').strip():
                        meta[field] = q[field].strip()

            unit_code  = meta.get('unit_code', '')
            unit_name  = meta.get('unit_name', '')
            institution_name = meta.get('institution', 'Kenyatta University')
            year       = parse_int(meta.get('year', ''))
            semester   = parse_int(meta.get('semester', ''))
            paper_type = meta.get('paper_type', 'End of Semester')

            # Build title: "ECU 103 Physics for Engineers 2 — 2023 S1"
            parts = [unit_code, unit_name] if unit_code else [source_file.replace('.pdf','')]
            if year:
                parts.append(str(year))
                if semester:
                    parts[-1] += f' S{semester}'
            title = ' — '.join(filter(None, parts))[:200]

            # Tags: unit_code, unit_name words, institution, year, paper_type, 'engineering', 'ku'
            tags = ['engineering', 'ku', 'kenyatta university', 'past paper']
            if unit_code:
                tags.append(unit_code.lower())
            if unit_name:
                tags += [w.lower() for w in re.findall(r'\b\w{4,}\b', unit_name)]
            if year:
                tags.append(str(year))
            if paper_type:
                tags.append(paper_type.lower())

            # Collect all question-level tags too
            for q in questions:
                tags += parse_tags(q.get('tags',''))
            tags = sorted(set(t.strip().lower() for t in tags if t.strip()))

            description = (
                f"{institution_name} — {unit_code} {unit_name}".strip(' —')
                + (f", {year}" if year else "")
                + (f" Semester {semester}" if semester else "")
                + (f" ({paper_type})" if paper_type else "")
                + f". {len(questions)} question(s). Source: Engineering Past Papers."
            )

            time_limit = max(30, len(questions) * 3)  # ~3 min per question

            if dry_run:
                self.stdout.write(f"  [DRY] {title!r} — {len(questions)} questions")
                created += 1
                continue

            try:
                existing = Assessment.objects.filter(
                    creator=creator,
                    source_attribution__icontains=source_file,
                ).first()

                if existing and not do_update:
                    skipped += 1
                    continue

                if existing and do_update:
                    assessment = existing
                    assessment.title       = title
                    assessment.description = description
                    assessment.tags        = tags
                    assessment.source_year = year
                    assessment.save()
                    assessment.questions.all().delete()
                    updated += 1
                    action = 'Updated'
                else:
                    assessment = Assessment.objects.create(
                        title=title,
                        topic=unit_name or unit_code or 'Engineering',
                        description=description,
                        creator=creator,
                        time_limit_minutes=time_limit,
                        assessment_type=Assessment.AssessmentType.EXAM,
                        is_public=True,
                        allow_students_see_results=True,
                        source_year=year,
                        source_attribution=f"Kenyatta University — {source_file}",
                        tags=tags,
                    )
                    created += 1
                    action = 'Created'

                # ── Questions ─────────────────────────────────────────────────
                for order, q in enumerate(questions, start=1):
                    q_type_raw = q.get('question_type', '').lower()
                    if q_type_raw in ('mcq',):
                        q_type = Question.QuestionType.MULTIPLE_CHOICE
                    elif q_type_raw in ('true_false',):
                        q_type = Question.QuestionType.TRUE_FALSE
                    else:
                        q_type = Question.QuestionType.ESSAY

                    marks_raw = q.get('marks', '')
                    try:
                        points = int(str(marks_raw).strip())
                    except:
                        points = 5

                    question = Question.objects.create(
                        assessment=assessment,
                        question_text=q.get('question_text', ''),
                        question_type=q_type,
                        correct_answer='',  # filled later when solutions are generated
                        explanation=q.get('model_solution', ''),
                        points=points,
                        order=order,
                        source_url='',
                    )

                    # Attach diagram image if available
                    if parse_bool(q.get('has_diagram','')) and diagrams_dir:
                        diagram_file = q.get('diagram_file','').strip()
                        if diagram_file:
                            src = diagrams_dir / Path(diagram_file).name
                            if not src.exists():
                                src = diagrams_dir.parent / diagram_file
                            if src.exists():
                                try:
                                    with open(src, 'rb') as img_file:
                                        qi = QuestionImage(
                                            question=question,
                                            filename=src.name,
                                        )
                                        qi.image.save(src.name, File(img_file), save=True)
                                except Exception as e:
                                    self.stderr.write(f"    [WARN] diagram: {e}")

                self.stdout.write(f"  [{action}] {title} ({len(questions)} questions)")

            except Exception as e:
                failed += 1
                self.stderr.write(f"  [ERR] {source_file}: {e}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done — created: {created}, updated: {updated}, skipped: {skipped}, failed: {failed}"
        ))
