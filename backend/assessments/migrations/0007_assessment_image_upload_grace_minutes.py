from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0006_userattempt_time_taken_seconds_userattempt_xp_earned'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='image_upload_grace_minutes',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Minutes after the test where image uploads are still allowed.',
            ),
        ),
    ]

