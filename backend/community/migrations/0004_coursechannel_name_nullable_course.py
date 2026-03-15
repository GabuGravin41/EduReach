from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('community', '0003_alter_threadreply_options_remove_threadreply_upvotes_and_more'),
        ('courses', '0004_course_unique_title_per_owner_ci'),
    ]

    operations = [
        migrations.AddField(
            model_name='coursechannel',
            name='name',
            field=models.CharField(
                blank=True,
                default='',
                help_text="Display name for non-course channels (e.g. 'Community')",
                max_length=100,
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='coursechannel',
            name='course',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='discussion_channel',
                to='courses.course',
            ),
        ),
    ]
