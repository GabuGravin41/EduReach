from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_level_user_show_xp_publicly_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='learning_goal',
            field=models.CharField(
                max_length=32,
                blank=True,
                help_text='Primary reason for using EduReach (e.g. olympiad, school, exams, curiosity).',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='learner_type',
            field=models.CharField(
                max_length=32,
                blank=True,
                help_text='Self-described role (e.g. high_school_student, university_student, teacher, professional).',
            ),
        ),
    ]

