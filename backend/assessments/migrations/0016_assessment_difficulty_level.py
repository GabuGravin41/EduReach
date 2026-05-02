from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0015_olympiad_fields_and_question_images'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='difficulty_level',
            field=models.CharField(
                blank=True,
                choices=[
                    ('cee',     'CEE / School'),
                    ('comp_oe', 'Competition (Open-Ended)'),
                    ('comp_tp', 'Competition (Proof)'),
                    ('imo',     'IMO Level'),
                ],
                default='',
                help_text='Difficulty tier used by the recommendation engine.',
                max_length=20,
            ),
        ),
    ]
