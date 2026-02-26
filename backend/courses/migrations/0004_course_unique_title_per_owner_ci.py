from django.db import migrations, models
import re


def _split_suffix(title: str):
    match = re.match(r'^(.*?)(?:\s\((\d+)\))?$', (title or '').strip())
    if not match:
        return (title or '').strip(), None
    base = (match.group(1) or '').strip()
    suffix = match.group(2)
    return base, int(suffix) if suffix else None


def dedupe_course_titles(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')

    # Process each owner's courses independently.
    owner_ids = (
        Course.objects.order_by()
        .values_list('owner_id', flat=True)
        .distinct()
    )

    for owner_id in owner_ids:
        owner_courses = list(
            Course.objects.filter(owner_id=owner_id).order_by('id')
        )
        used_titles = set()

        for course in owner_courses:
            original = (course.title or '').strip() or 'Untitled Course'
            candidate = original

            # If exact title already used, append next available numeric suffix.
            if candidate in used_titles:
                base, _ = _split_suffix(original)
                base = base or original

                # Build currently used suffixes for this base.
                used_suffixes = set()
                for used in used_titles:
                    used_base, used_n = _split_suffix(used)
                    if used_base == base:
                        used_suffixes.add(used_n if used_n is not None else 1)

                suffix = 2
                while suffix in used_suffixes:
                    suffix += 1
                candidate = f'{base} ({suffix})'
                while candidate in used_titles:
                    suffix += 1
                    candidate = f'{base} ({suffix})'

            if candidate != course.title:
                course.title = candidate
                course.save(update_fields=['title'])

            used_titles.add(candidate)


def noop_reverse(apps, schema_editor):
    # No safe reverse for data renames.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_coursepricing_creatortip_contentpurchase_and_more'),
    ]

    operations = [
        migrations.RunPython(dedupe_course_titles, noop_reverse),
        migrations.AddConstraint(
            model_name='course',
            constraint=models.UniqueConstraint(
                fields=('owner', 'title'),
                name='unique_course_title_per_owner',
            ),
        ),
    ]
