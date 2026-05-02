"""
Tag the 17 existing MathNet/IMO papers with difficulty_level='imo'
and ensure their tags contain the correct subfield for the recommendation engine.

Safe to re-run (idempotent).
"""
from django.core.management.base import BaseCommand


MATHNET_SUBFIELD_TAGS = ['olympiad', 'math', 'proof']

# Map from tags already on the assessment to a canonical math subfield
SUBFIELD_HINTS = {
    'geometry':        'Geometry',
    'algebra':         'Algebra',
    'combinatorics':   'Combinatorics',
    'number_theory':   'Number Theory',
    'number theory':   'Number Theory',
    'discrete mathematics': 'Combinatorics',
}


class Command(BaseCommand):
    help = "Set difficulty_level='imo' on existing MathNet Olympiad Contest papers"

    def handle(self, *args, **options):
        from assessments.models import Assessment

        qs = Assessment.objects.filter(title__startswith='Olympiad Contest ')
        updated = 0

        for assessment in qs:
            changed = False

            if assessment.difficulty_level != 'imo':
                assessment.difficulty_level = 'imo'
                changed = True

            # Try to add a canonical subfield tag if missing
            current_tags: list = list(assessment.tags or [])
            has_subfield = any(
                t in ('Geometry', 'Algebra', 'Combinatorics', 'Number Theory')
                for t in current_tags
            )
            if not has_subfield:
                for tag in current_tags:
                    subfield = SUBFIELD_HINTS.get(tag.lower())
                    if subfield:
                        current_tags.append(subfield)
                        assessment.tags = current_tags
                        changed = True
                        break

            if changed:
                assessment.save(update_fields=['difficulty_level', 'tags'])
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Updated {updated} / {qs.count()} MathNet papers → difficulty_level=imo')
        )
