from django.db import models


class VideoCache(models.Model):
    url = models.URLField(unique=True, db_index=True)
    video_id = models.CharField(max_length=32, unique=True, db_index=True)
    title = models.CharField(max_length=1000, blank=True)
    channel_name = models.CharField(max_length=300, blank=True)
    transcript = models.TextField(blank=True)
    transcript_json = models.JSONField(null=True, blank=True)
    topic_tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    fetched_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fetched_at']

    def __str__(self) -> str:
        return f"{self.video_id} - {self.title[:60]}"
