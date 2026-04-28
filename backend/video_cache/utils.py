"""Utilities for importing video cache state into the VideoCache model."""
from typing import Dict, Any, Tuple


def import_state_dict(state: Dict[str, Any], VideoCache) -> Dict[str, int]:
    """Import a parsed state dict (from fetcher) into the VideoCache model.

    ``state`` structure expected: ``{'results': { topic: [items...] }}``

    Returns a dict with ``{'created': N, 'updated': N, 'total': N}`` so callers
    can log progress without parsing return values.

    Topic tags are *merged* on update rather than overwritten, so a video that
    appears in two topics retains both tags after the second import.
    """
    results = state.get('results', {})
    created_count = 0
    updated_count = 0

    for topic, items in results.items():
        for item in items:
            vid = item.get('video_id')
            if not vid:
                continue

            new_tag = item.get('topic') or topic or ''

            # Build the defaults dict for a fresh create
            defaults = {
                'url': item.get('url') or f'https://www.youtube.com/watch?v={vid}',
                'title': item.get('title', ''),
                'channel_name': item.get('channel_name', ''),
                'transcript': item.get('transcript', '') or '',
                'transcript_json': item.get('transcript_json') or None,
                'topic_tags': [new_tag] if new_tag else [],
                'metadata': {
                    'view_count': item.get('view_count'),
                    'duration': item.get('duration'),
                    'thumbnail_url': item.get('thumbnail_url'),
                    'fetched_at': item.get('fetched_at'),
                },
            }

            obj, created = VideoCache.objects.get_or_create(
                video_id=vid,
                defaults=defaults,
            )

            if created:
                created_count += 1
            else:
                # Merge topic tags — preserve existing tags from previous imports
                existing_tags: list = list(obj.topic_tags or [])
                if new_tag and new_tag not in existing_tags:
                    existing_tags.append(new_tag)

                # Update mutable fields; never overwrite a good transcript with empty
                obj.url = defaults['url'] or obj.url
                obj.title = defaults['title'] or obj.title
                obj.channel_name = defaults['channel_name'] or obj.channel_name
                obj.topic_tags = existing_tags
                obj.metadata = defaults['metadata']
                if defaults['transcript']:
                    obj.transcript = defaults['transcript']
                if defaults['transcript_json']:
                    obj.transcript_json = defaults['transcript_json']
                obj.save(update_fields=[
                    'url', 'title', 'channel_name', 'topic_tags',
                    'metadata', 'transcript', 'transcript_json',
                ])
                updated_count += 1

    total = created_count + updated_count
    return {'created': created_count, 'updated': updated_count, 'total': total}

