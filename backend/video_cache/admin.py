from django.contrib import admin
from django.http import HttpResponse
import json

from .models import VideoCache


@admin.register(VideoCache)
class VideoCacheAdmin(admin.ModelAdmin):
    list_display = ('video_id', 'title', 'channel_name', 'is_processed', 'fetched_at')
    search_fields = ('video_id', 'title', 'channel_name')
    list_filter = ('is_processed', 'fetched_at',)
    actions = ['export_selected_as_json', 'extract_knowledge_action']

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

    def extract_knowledge_action(self, request, queryset):
        from .services import extract_knowledge_for_video
        success_count = 0
        failure_count = 0
        
        for obj in queryset:
            if extract_knowledge_for_video(obj):
                success_count += 1
            else:
                failure_count += 1
                
        self.message_user(request, f"Knowledge extraction complete: {success_count} succeeded, {failure_count} failed.")

    extract_knowledge_action.short_description = 'Extract Knowledge with AI (Gemini)'
