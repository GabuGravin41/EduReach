from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_user_learning_preferences'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='interests',
            field=models.TextField(
                blank=True,
                help_text='Comma-separated list of interest tags (e.g. math, programming, languages, exams).',
            ),
        ),
    ]

