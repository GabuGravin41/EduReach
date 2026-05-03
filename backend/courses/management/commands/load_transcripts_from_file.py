"""
Management command: load_transcripts_from_file
-----------------------------------------------
Reads a JSON file (mapping lesson_id → transcript_text) produced by the
local fetch_transcripts_local.py script and writes the transcripts into
the database.

Usage:
  python manage.py load_transcripts_from_file /tmp/transcripts.json
"""

import json
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = 'Import transcripts from a JSON file into Lesson records.'

    def add_arguments(self, parser):
        parser.add_argument('file', help='Path to the JSON file (lesson_id → transcript).')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Print what would be updated without writing to the database.',
        )

    def handle(self, *args, **options):
        from courses.models import Lesson

        filepath = options['file']
        dry_run = options['dry_run']

        try:
            with open(filepath) as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f'File not found: {filepath}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON in {filepath}: {e}')

        if not isinstance(data, dict):
            raise CommandError('JSON must be an object mapping lesson_id → transcript_text.')

        self.stdout.write(self.style.NOTICE(f'Loaded {len(data)} entries from {filepath}'))

        success = 0
        skipped = 0
        not_found = 0

        for lesson_id_str, transcript_text in data.items():
            try:
                lesson_id = int(lesson_id_str)
            except ValueError:
                self.stdout.write(self.style.WARNING(f'  Skipping non-integer key: {lesson_id_str}'))
                skipped += 1
                continue

            if not transcript_text or not transcript_text.strip():
                skipped += 1
                continue

            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Lesson {lesson_id} not found in database'))
                not_found += 1
                continue

            if dry_run:
                self.stdout.write(f'  [DRY RUN] Would update lesson {lesson_id}: {lesson.title[:60]}')
                success += 1
                continue

            lesson.transcript = transcript_text.strip()
            lesson.transcript_fetched_at = timezone.now()
            lesson.save(update_fields=['transcript', 'transcript_fetched_at'])
            self.stdout.write(f'  Updated lesson {lesson_id}: {lesson.title[:60]}')
            success += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. {success} updated, {skipped} skipped (empty), {not_found} not found.'
            )
        )
