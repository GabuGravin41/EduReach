"""
Backfill auto-generated tags on all existing assessments.

Usage:
    python manage.py backfill_tags
    python manage.py backfill_tags --dry-run
"""
from django.core.management.base import BaseCommand
from assessments.models import Assessment
from assessments.signals import _generate_tags


class Command(BaseCommand):
    help = 'Auto-generate and merge tags for all existing assessments.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Print changes without saving.')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        assessments = Assessment.objects.all()
        updated = 0

        for assessment in assessments:
            new_tags = _generate_tags(assessment)
            existing = list(assessment.tags or [])
            merged = sorted(set(existing) | set(new_tags))

            if merged != existing:
                if not dry_run:
                    Assessment.objects.filter(pk=assessment.pk).update(tags=merged)
                updated += 1
                self.stdout.write(
                    f'[{"DRY" if dry_run else "OK"}] #{assessment.pk} "{assessment.title}": '
                    f'{existing} → {merged}'
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n{"Would update" if dry_run else "Updated"} {updated} / {assessments.count()} assessments.'
            )
        )
