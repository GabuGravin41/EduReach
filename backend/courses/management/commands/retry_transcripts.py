"""
Management command: retry_transcripts
--------------------------------------
Scans all Lesson records where the transcript is empty (or blank)
and attempts to re-fetch the YouTube transcript.

Usage:
  python manage.py retry_transcripts                   # process all
  python manage.py retry_transcripts --limit 20        # cap at 20 lessons
  python manage.py retry_transcripts --course_id 5     # one course only

Schedule via cron (every night at 2 AM):
  0 2 * * * /path/to/venv/bin/python /path/to/manage.py retry_transcripts --limit 50
"""

import time
import logging
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Retry fetching transcripts for lessons that have no transcript.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Maximum number of lessons to process in one run (0 = unlimited).',
        )
        parser.add_argument(
            '--course_id',
            type=int,
            default=0,
            help='Restrict to a single course ID.',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.5,
            help='Seconds to wait between requests (default: 1.5 to avoid rate limits).',
        )

    def handle(self, *args, **options):
        from courses.models import Lesson
        from services.youtube_service import YouTubeTranscriptService

        qs = Lesson.objects.filter(
            video_id__isnull=False,
        ).exclude(video_id='').filter(
            transcript='',
            manual_transcript='',
        )

        if options['course_id']:
            qs = qs.filter(course_id=options['course_id'])

        total = qs.count()
        limit = options['limit'] or total
        qs = qs.order_by('transcript_fetched_at')[:limit]

        self.stdout.write(
            self.style.NOTICE(
                f'Found {total} lessons without transcripts. Processing up to {limit}.'
            )
        )

        svc = YouTubeTranscriptService()
        success_count = 0
        fail_count = 0

        for lesson in qs:
            try:
                self.stdout.write(
                    f'  → {lesson.title} [{lesson.video_id}] ... ',
                    ending='',
                )
                self.stdout.flush()

                transcript_data = svc.extract_transcript(lesson.video_id)
                transcript_text = transcript_data.get('text', '') if isinstance(transcript_data, dict) else str(transcript_data)

                if transcript_text and transcript_text.strip():
                    lesson.transcript = transcript_text.strip()
                    lesson.transcript_fetched_at = timezone.now()
                    lesson.save(update_fields=['transcript', 'transcript_fetched_at'])
                    self.stdout.write(self.style.SUCCESS('OK'))
                    success_count += 1
                else:
                    self.stdout.write(self.style.WARNING('empty transcript returned'))
                    lesson.transcript_fetched_at = timezone.now()
                    lesson.save(update_fields=['transcript_fetched_at'])
                    fail_count += 1

            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'FAILED: {exc}'))
                logger.warning('Transcript retry failed for lesson %s: %s', lesson.id, exc)
                fail_count += 1

            if options['delay'] > 0:
                time.sleep(options['delay'])

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. {success_count} updated, {fail_count} failed / no transcript.'
            )
        )
