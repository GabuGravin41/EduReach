from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_user_interests'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_cover',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='profile_covers/',
                help_text='Optional cover image for profile header. If not set, gradient is shown.',
            ),
        ),
    ]
