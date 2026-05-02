from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_institution_user_institution_role_user_institution'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='topic_mastery',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    'Per-topic performance profile keyed by "Topic_difficulty". '
                    'e.g. {"Geometry_comp_oe": {"attempts":5,"avg_score":0.42,"last_seen":"..."}}'
                ),
            ),
        ),
    ]
