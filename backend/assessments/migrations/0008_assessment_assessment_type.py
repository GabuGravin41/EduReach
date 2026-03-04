from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0007_assessment_image_upload_grace_minutes'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='assessment_type',
            field=models.CharField(
                max_length=10,
                choices=[('quiz', 'Quiz'), ('exam', 'Exam')],
                default='exam',
                help_text='Whether this is a quiz (lighter) or exam (more rigorous).',
            ),
        ),
    ]

