from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0013_exam_session_guest_attempt'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='source_url',
            field=models.URLField(
                blank=True,
                help_text='Link to the original source (e.g. university past-paper portal, Olympiad archive).',
            ),
        ),
        migrations.AddField(
            model_name='question',
            name='source_url',
            field=models.URLField(
                blank=True,
                help_text='Link to the original source for this specific question (overrides assessment-level source_url).',
            ),
        ),
    ]
