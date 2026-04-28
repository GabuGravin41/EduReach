from django.contrib import admin
from django.http import HttpResponse
import json

from .models import VideoCache


@admin.register(VideoCache)
class VideoCacheAdmin(admin.ModelAdmin):
    list_display = ('video_id', 'title', 'channel_name', 'fetched_at')
    search_fields = ('video_id', 'title', 'channel_name')
    list_filter = ('fetched_at',)
    actions = ['export_selected_as_json']

    def export_selected_as_json(self, request, queryset):
        data = []
        for obj in queryset:
            data.append({
                'video_id': obj.video_id,
                'url': obj.url,
                'title': obj.title,
                'channel_name': obj.channel_name,
                'transcript': obj.transcript,
                'transcript_json': obj.transcript_json,
                'topic_tags': obj.topic_tags,
                'metadata': obj.metadata,
                'fetched_at': obj.fetched_at.isoformat() if obj.fetched_at else None,
            })

        content = json.dumps({'exported_at': __import__('time').time(), 'results': data}, ensure_ascii=False, indent=2)
        resp = HttpResponse(content, content_type='application/json')
        resp['Content-Disposition'] = 'attachment; filename=video_cache_export.json'
        return resp

    export_selected_as_json.short_description = 'Export selected videos as JSON'
