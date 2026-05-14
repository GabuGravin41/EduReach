from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('study_groups', '0005_studygroup_through_model_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='studygroupchallenge',
            name='exam_mode',
            field=models.BooleanField(
                default=False,
                help_text='When True, Easy Mode/AI hints are disabled and tab switches are logged.',
            ),
        ),
        migrations.AddField(
            model_name='studygroupchallenge',
            name='results_released',
            field=models.BooleanField(
                default=False,
                help_text='When False, only the creator can see student results.',
            ),
        ),
        migrations.AddField(
            model_name='studygroupchallenge',
            name='tab_switch_limit',
            field=models.PositiveIntegerField(
                default=3,
                help_text='Number of tab switches before the exam auto-submits.',
            ),
        ),
    ]
