"""Surface every existing Course as a curriculum Unit.

Each Course becomes a 'general' track Unit (source_course points back to it),
and that course's lessons are linked to the new unit. The Course model is kept
as the backing store for pricing/progress/purchases — this migration only
makes courses appear in the unified unit experience.

Idempotent: a course that already has a derived unit is skipped.
"""
from django.db import migrations


def courses_to_units(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    Lesson = apps.get_model('courses', 'Lesson')
    Unit = apps.get_model('curriculum', 'Unit')

    for course in Course.objects.all():
        if Unit.objects.filter(source_course_id=course.id).exists():
            continue
        summary = (course.description or '').strip()
        if len(summary) < 10:
            summary = f'Video course: {course.title}.'
        unit = Unit.objects.create(
            track='general',
            name=(course.title or 'Untitled course')[:200],
            code='',
            institution='',
            level='',
            syllabus_summary=summary,
            description=(course.description or '')[:300],
            topic_keywords=[],
            is_official=False,
            is_public=bool(course.is_public),
            created_by_id=course.owner_id,
            source_course_id=course.id,
        )
        Lesson.objects.filter(course_id=course.id).update(unit_id=unit.id)


def reverse(apps, schema_editor):
    Unit = apps.get_model('curriculum', 'Unit')
    Unit.objects.filter(track='general', source_course__isnull=False).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0003_unit_is_public_unit_source_course_alter_unit_track'),
        ('courses', '0006_lesson_unit'),
    ]

    operations = [
        migrations.RunPython(courses_to_units, reverse),
    ]
