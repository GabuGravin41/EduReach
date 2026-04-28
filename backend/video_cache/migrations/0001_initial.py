from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='VideoCache',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(unique=True, db_index=True)),
                ('video_id', models.CharField(max_length=32, unique=True, db_index=True)),
                ('title', models.CharField(blank=True, max_length=1000)),
                ('channel_name', models.CharField(blank=True, max_length=300)),
                ('transcript', models.TextField(blank=True)),
                ('transcript_json', models.JSONField(blank=True, null=True)),
                ('topic_tags', models.JSONField(blank=True, default=list)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('fetched_at', models.DateTimeField(auto_now_add=True)),
                ('last_accessed', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-fetched_at'],
            },
        ),
    ]
