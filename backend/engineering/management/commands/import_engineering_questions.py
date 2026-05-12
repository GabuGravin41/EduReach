"""
Usage:
    python manage.py import_engineering_questions \
        --csv /path/to/engineering_questions.csv \
        --diagrams /path/to/dataset/diagrams/

    # Dry run (no DB writes)
    python manage.py import_engineering_questions --csv ... --diagrams ... --dry-run

    # Update existing rows (default: skip duplicates)
    python manage.py import_engineering_questions --csv ... --diagrams ... --update
"""

import csv
import shutil
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from engineering.models import EngineeringProblem


def parse_bool(val: str) -> bool:
    return str(val).strip().lower() in ('true', '1', 'yes')


def parse_int(val: str):
    try:
        return int(str(val).strip())
    except (ValueError, TypeError):
        return None


def parse_tags(val: str) -> list:
    if not val or not val.strip():
        return []
    return [t.strip() for t in val.split(',') if t.strip()]


class Command(BaseCommand):
    help = 'Import engineering problems from the extraction CSV into the database'

    def add_arguments(self, parser):
        parser.add_argument('--csv', required=True, help='Path to engineering_questions.csv')
        parser.add_argument('--diagrams', default='', help='Path to diagrams/ folder (optional)')
        parser.add_argument('--dry-run', action='store_true', help='Preview without writing to DB')
        parser.add_argument('--update', action='store_true', help='Update existing records (default: skip)')

    def handle(self, *args, **options):
        csv_path = Path(options['csv'])
        if not csv_path.exists():
            raise CommandError(f"CSV not found: {csv_path}")

        diagrams_dir = Path(options['diagrams']) if options['diagrams'] else None
        dry_run = options['dry_run']
        do_update = options['update']

        created = skipped = updated = failed = 0

        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        self.stdout.write(f"Reading {len(rows)} rows from {csv_path.name}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no DB writes"))

        for row in rows:
            source_file = row.get('source_file', '').strip()
            question_number = row.get('question_number', '').strip()

            if not source_file or not question_number:
                failed += 1
                self.stderr.write(f"  [SKIP] Missing source_file or question_number: {row}")
                continue

            defaults = {
                'unit_code': row.get('unit_code', '').strip(),
                'unit_name': row.get('unit_name', '').strip(),
                'institution': row.get('institution', '').strip(),
                'year': parse_int(row.get('year', '')),
                'semester': parse_int(row.get('semester', '')),
                'paper_type': row.get('paper_type', '').strip(),
                'question_text': row.get('question_text', '').strip(),
                'marks': row.get('marks', '').strip(),
                'question_type': row.get('question_type', '').strip(),
                'difficulty': row.get('difficulty', 'medium').strip() or 'medium',
                'tags': parse_tags(row.get('tags', '')),
                'has_diagram': parse_bool(row.get('has_diagram', 'false')),
                'diagram_description': row.get('diagram_description', '').strip(),
                'model_solution': row.get('model_solution', '').strip(),
            }

            # Determine solution status
            if defaults['model_solution']:
                defaults['solution_status'] = EngineeringProblem.SolutionStatus.GENERATED
            else:
                defaults['solution_status'] = EngineeringProblem.SolutionStatus.PENDING

            # Validate difficulty
            valid_difficulties = [c[0] for c in EngineeringProblem.Difficulty.choices]
            if defaults['difficulty'] not in valid_difficulties:
                defaults['difficulty'] = 'medium'

            if dry_run:
                self.stdout.write(f"  [DRY] {source_file} | {question_number}")
                created += 1
                continue

            try:
                obj, was_created = EngineeringProblem.objects.get_or_create(
                    source_file=source_file,
                    question_number=question_number,
                    defaults=defaults,
                )

                if was_created:
                    created += 1
                    self._attach_diagram(obj, row, diagrams_dir)
                    self.stdout.write(f"  [+] {source_file} | {question_number}")
                elif do_update:
                    for field, val in defaults.items():
                        setattr(obj, field, val)
                    obj.save()
                    self._attach_diagram(obj, row, diagrams_dir)
                    updated += 1
                    self.stdout.write(f"  [~] {source_file} | {question_number} (updated)")
                else:
                    skipped += 1

            except Exception as e:
                failed += 1
                self.stderr.write(f"  [ERR] {source_file} | {question_number}: {e}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done — created: {created}, updated: {updated}, skipped: {skipped}, failed: {failed}"
        ))

    def _attach_diagram(self, obj: EngineeringProblem, row: dict, diagrams_dir):
        diagram_file = row.get('diagram_file', '').strip()
        if not diagram_file or not diagrams_dir:
            return
        if obj.diagram_image:
            return  # already has one

        # diagram_file may be a relative path like "diagrams/abc.jpg" or just "abc.jpg"
        src = diagrams_dir / Path(diagram_file).name
        if not src.exists():
            # try treating diagram_file as absolute/relative to diagrams_dir parent
            src = diagrams_dir.parent / diagram_file
        if not src.exists():
            self.stderr.write(f"    [WARN] Diagram not found: {diagram_file}")
            return

        with open(src, 'rb') as img_file:
            obj.diagram_image.save(src.name, File(img_file), save=True)
