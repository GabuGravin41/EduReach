"""
Management command: enrich_missing_transcripts

For every lesson that has no transcript (auto or manual), this command:
  1. Tries to fetch the transcript one more time via yt-dlp / youtube-transcript-api
  2. If that fails, scrapes the video description + oEmbed metadata from YouTube
  3. Stores the description in lesson.description so the AI tutor can use it

Usage:
    python manage.py enrich_missing_transcripts
    python manage.py enrich_missing_transcripts --dry-run      # report only, no writes
    python manage.py enrich_missing_transcripts --skip-retry   # skip transcript retry, description-only
"""

import time
from django.core.management.base import BaseCommand
from courses.models import Lesson
from services.youtube_service import YouTubeTranscriptService


class Command(BaseCommand):
    help = 'Enrich lessons that have no transcript with video description and metadata.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Report what would happen without writing.')
        parser.add_argument('--skip-retry', action='store_true', help='Skip transcript re-fetch attempt.')
        parser.add_argument('--delay', type=float, default=1.5, help='Seconds to wait between requests (default 1.5).')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        skip_retry = options['skip_retry']
        delay = options['delay']

        svc = YouTubeTranscriptService()

        # Lessons with no transcript at all
        lessons = Lesson.objects.filter(transcript='', manual_transcript='').select_related('course')
        total = lessons.count()

        self.stdout.write(self.style.WARNING(
            f"\n{'[DRY RUN] ' if dry_run else ''}Found {total} lesson(s) with no transcript.\n"
        ))

        got_transcript = 0
        got_description = 0
        already_has_desc = 0
        failed = 0

        for i, lesson in enumerate(lessons, 1):
            prefix = f"[{i}/{total}] {lesson.course.title} — {lesson.title}"

            if not lesson.video_id:
                self.stdout.write(f"  {prefix}: skipped (no video_id)")
                continue

            # ── Step 1: retry transcript fetch ─────────────────────────────────
            if not skip_retry:
                try:
                    result = svc.extract_transcript(lesson.video_id)
                    if result and result.get('transcript'):
                        transcript_text = result['transcript']
                        if not dry_run:
                            lesson.transcript = transcript_text
                            lesson.save(update_fields=['transcript'])
                        got_transcript += 1
                        self.stdout.write(self.style.SUCCESS(
                            f"  {prefix}: ✓ transcript retrieved ({len(transcript_text)} chars)"
                        ))
                        time.sleep(delay)
                        continue
                except Exception as e:
                    self.stdout.write(f"  {prefix}: transcript fetch error — {e}")

            # ── Step 2: fetch and store description ────────────────────────────
            if lesson.description:
                already_has_desc += 1
                self.stdout.write(f"  {prefix}: description already present ({len(lesson.description)} chars)")
                continue

            try:
                meta = svc.get_video_metadata(lesson.video_id)
                description = svc.get_video_description(lesson.video_id)
                channel = meta.get('author', '')
                video_title = meta.get('title', lesson.title)

                if description or channel:
                    # Build a rich description block to store
                    parts = []
                    if video_title and video_title != lesson.title:
                        parts.append(f"Video title: {video_title}")
                    if channel:
                        parts.append(f"Channel: {channel}")
                    if description:
                        parts.append(f"\n{description}")
                    rich_desc = '\n'.join(parts).strip()

                    if not dry_run:
                        lesson.description = rich_desc
                        lesson.save(update_fields=['description'])
                    got_description += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"  {prefix}: ✓ description stored ({len(rich_desc)} chars)"
                    ))
                else:
                    failed += 1
                    self.stdout.write(self.style.WARNING(
                        f"  {prefix}: ✗ no description found"
                    ))

            except Exception as e:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  {prefix}: ✗ error — {e}"))

            time.sleep(delay)

        self.stdout.write('\n' + '─' * 60)
        self.stdout.write(self.style.SUCCESS(f"Transcripts fetched:   {got_transcript}"))
        self.stdout.write(self.style.SUCCESS(f"Descriptions stored:   {got_description}"))
        self.stdout.write(f"Already had desc:      {already_has_desc}")
        self.stdout.write(self.style.WARNING(f"Failed/no data:        {failed}"))
        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] No changes were written."))
        self.stdout.write('')
