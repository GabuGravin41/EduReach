from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0016_assessment_difficulty_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='userattempt',
            name='tab_switches',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userattempt',
            name='tab_events',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
