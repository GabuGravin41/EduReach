"""Grade all submitted attempts (background grading). Run via cron e.g. every 1–2 minutes."""
from django.core.management.base import BaseCommand
from assessments.models import UserAttempt


class Command(BaseCommand):
    help = 'Run grading for all attempts in status SUBMITTED (e.g. after submit with essay/AI-graded questions).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Max number of attempts to grade in one run (default 100).',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        attempts = UserAttempt.objects.filter(status=UserAttempt.Status.SUBMITTED).select_related(
            'assessment', 'user'
        )[:limit]
        count = 0
        for attempt in attempts:
            try:
                attempt.calculate_score()
                count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Attempt {attempt.id}: {e}'))
        self.stdout.write(self.style.SUCCESS(f'Graded {count} attempt(s).'))
