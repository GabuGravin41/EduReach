"""Split concatenated engineering assessments into individual papers.

Transcription merged ~9-10 separate exam papers into single assessments with
40-70 questions. Engineering papers run ~5 questions each, so the reliable fix
is: drop the OCR-garbage header questions, then cut the real questions into
fixed-size chunks — one assessment per chunk.

Dry-run by default. Pass --apply to actually write changes.

    python manage.py split_concatenated_assessments              # preview all
    python manage.py split_concatenated_assessments --id 1002    # preview one
    python manage.py split_concatenated_assessments --apply      # do it
"""
import re

from django.core.management.base import BaseCommand
from django.db.models import Count

from assessments.models import Assessment, Question

# A question whose text is just a section header — OCR noise, not a real
# question. e.g. "QUESTION ONE", "Question Four", "QUESTION THREE:", "UEST ION TWO".
_HEADER_RE = re.compile(
    r'^\s*(?:U?\s*EST\s*ION|QUESTION|QN|SECTION|PART)\b[\s:.\-]*'
    r'(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|[A-Z]|\d{1,2})?'
    r'[\s:.\-]*$',
    re.IGNORECASE,
)


def is_junk_header(text: str) -> bool:
    t = (text or '').strip()
    return len(t) <= 32 and bool(_HEADER_RE.match(t))


# Assessment fields copied verbatim onto each split-off paper.
_COPY_FIELDS = [
    'topic', 'description', 'creator', 'assessment_type', 'is_public',
    'results_visibility', 'allow_students_see_results', 'institution',
    'source_year', 'source_attribution', 'source_url', 'difficulty_level',
    'competition_country', 'competition_name', 'competition_language', 'unit',
]


class Command(BaseCommand):
    help = 'Split over-long concatenated assessments into individual papers.'

    def add_arguments(self, parser):
        parser.add_argument('--threshold', type=int, default=12,
                            help='Only process assessments with more than this many questions.')
        parser.add_argument('--chunk-size', type=int, default=5,
                            help='Questions per resulting paper.')
        parser.add_argument('--time-minutes', type=int, default=120,
                            help='Time limit set on each resulting paper.')
        parser.add_argument('--id', type=int, default=None,
                            help='Process only this assessment id.')
        parser.add_argument('--apply', action='store_true',
                            help='Write changes. Without this the command only previews.')

    def handle(self, *args, **opts):
        threshold = opts['threshold']
        chunk_size = max(2, opts['chunk_size'])
        time_minutes = opts['time_minutes']
        apply = opts['apply']

        qs = Assessment.objects.annotate(qc=Count('questions'))
        if opts['id']:
            qs = qs.filter(id=opts['id'])
        else:
            qs = qs.filter(qc__gt=threshold)
        qs = qs.order_by('-qc')

        if not qs.exists():
            self.stdout.write('No assessments over the threshold. Nothing to do.')
            return

        mode = 'APPLYING' if apply else 'DRY RUN — preview only (pass --apply to write)'
        self.stdout.write(self.style.WARNING(f'== {mode} =='))

        for assessment in qs:
            self._process(assessment, chunk_size, time_minutes, apply)

        if not apply:
            self.stdout.write(self.style.WARNING(
                '\nNothing was changed. Re-run with --apply to perform the split.'))

    def _process(self, assessment, chunk_size, time_minutes, apply):
        questions = list(assessment.questions.all().order_by('order', 'id'))
        junk = [q for q in questions if is_junk_header(q.question_text)]
        real = [q for q in questions if not is_junk_header(q.question_text)]

        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING(
            f'#{assessment.id}  "{assessment.title[:60]}"'))
        self.stdout.write(
            f'  {len(questions)} questions  →  {len(junk)} junk header(s) removed, '
            f'{len(real)} real questions')

        # Chunk real questions; merge a tiny trailing chunk into the previous one.
        chunks = [real[i:i + chunk_size] for i in range(0, len(real), chunk_size)]
        if len(chunks) > 1 and len(chunks[-1]) <= chunk_size // 2:
            chunks[-2].extend(chunks[-1])
            chunks.pop()

        if len(chunks) <= 1:
            self.stdout.write('  → single paper; will only strip junk headers.')
        else:
            self.stdout.write(f'  → splitting into {len(chunks)} papers '
                              f'({", ".join(str(len(c)) for c in chunks)} questions each)')

        if not apply:
            return

        # Junk headers are not real questions — delete them.
        for q in junk:
            q.delete()

        base_title = re.sub(r'\s*[—-]\s*Paper\s*\d+\s*$', '', assessment.title).strip()

        for idx, chunk in enumerate(chunks):
            if idx == 0:
                target = assessment
                target.title = f'{base_title} — Paper 1' if len(chunks) > 1 else base_title
                target.time_limit_minutes = time_minutes
                target.save(update_fields=['title', 'time_limit_minutes', 'updated_at'])
            else:
                target = Assessment.objects.create(
                    title=f'{base_title} — Paper {idx + 1}',
                    time_limit_minutes=time_minutes,
                    **{f: getattr(assessment, f) for f in _COPY_FIELDS},
                )
            for order, q in enumerate(chunk):
                Question.objects.filter(pk=q.pk).update(assessment=target, order=order)

        self.stdout.write(self.style.SUCCESS(
            f'  ✓ done — {len(chunks)} paper(s), {len(junk)} junk question(s) removed.'))
