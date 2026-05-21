"""Keep a curriculum Unit in sync with every Course.

The data migration linked existing courses to units; these signals do the same
for courses and lessons created afterwards, so a course always appears as a
unit in the unified experience.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from courses.models import Course, Lesson
from .models import Unit


@receiver(post_save, sender=Course)
def sync_course_unit(sender, instance, created, **kwargs):
    summary = (instance.description or '').strip() or f'Video course: {instance.title}.'
    unit = Unit.objects.filter(source_course=instance).first()
    if unit:
        unit.name = (instance.title or unit.name)[:200]
        unit.is_public = bool(instance.is_public)
        unit.save(update_fields=['name', 'is_public', 'updated_at'])
    else:
        Unit.objects.create(
            track=Unit.Track.GENERAL,
            name=(instance.title or 'Untitled course')[:200],
            syllabus_summary=summary,
            description=(instance.description or '')[:300],
            is_official=False,
            is_public=bool(instance.is_public),
            created_by=instance.owner,
            source_course=instance,
        )


@receiver(post_save, sender=Lesson)
def sync_lesson_unit(sender, instance, created, **kwargs):
    if instance.unit_id:
        return
    unit = Unit.objects.filter(source_course_id=instance.course_id).first()
    if unit:
        # Direct FK update — avoids re-triggering this signal.
        Lesson.objects.filter(pk=instance.pk).update(unit=unit)
