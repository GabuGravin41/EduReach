"""
Management command: export_video_cache

Exports the VideoCache database table back to the same JSON format used by
fetch_videos_by_topic so that:
  - The cached data can be re-imported on a fresh DB.
  - The state file can be synced to Firebase / a remote store.
  - You can inspect what is actually stored without raw SQL.

Usage examples
--------------
  # Write to the default state file location
  python manage.py export_video_cache

  # Write to a custom file
  python manage.py export_video_cache --output /tmp/cache_backup.json

  # Export only specific topics
  python manage.py export_video_cache --topics "Python" "Machine Learning"

  # Pretty-print to stdout (useful for piping to jq)
  python manage.py export_video_cache --stdout
"""
from __future__ import annotations

import json
import os
import sys
from typing import List

from django.conf import settings
from django.core.management.base import BaseCommand

from video_cache.management.commands.fetch_videos_by_topic import STATE_DEFAULT


class Command(BaseCommand):
    help = 'Export the VideoCache table to the fetcher-compatible JSON state file.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output', '-o',
            type=str,
            default=STATE_DEFAULT,
            help=f'Output file path (default: {STATE_DEFAULT})',
        )
        parser.add_argument(
            '--topics',
            nargs='*',
            default=None,
            help='Only export videos whose topic_tags contain one of these topics. '
                 'Default: export all topics.',
        )
        parser.add_argument(
            '--stdout',
            action='store_true',
            help='Write JSON to stdout instead of a file (ignores --output).',
        )
        parser.add_argument(
            '--indent',
            type=int,
            default=2,
            help='JSON indentation (default: 2). Use 0 for compact output.',
        )

    def handle(self, *args, **options):
        from video_cache.models import VideoCache  # local import avoids circular deps

        output_path: str = options['output']
        filter_topics: List[str] | None = options.get('topics') or None
        to_stdout: bool = options['stdout']
        indent: int = options['indent'] or None  # type: ignore[assignment]

        qs = VideoCache.objects.all().order_by('id')

        # --topics filter: keep only entries whose topic_tags intersect the filter list
        if filter_topics:
            # topic_tags is a JSONField (list of strings); filter in Python for portability
            filter_set = {t.lower() for t in filter_topics}

        # Build the state dict that mirrors the fetcher format
        results: dict = {}
        skipped = 0
        exported = 0

        for obj in qs.iterator():
            tags: list = list(obj.topic_tags or [])

            if filter_topics:
                # Keep entry only if any tag matches the filter (case-insensitive)
                if not any(t.lower() in filter_set for t in tags):
                    skipped += 1
                    continue

            # Group by first tag (primary topic) for the state['results'] structure
            primary_topic = tags[0] if tags else '__uncategorized__'

            item = {
                'video_id': obj.video_id,
                'url': obj.url,
                'title': obj.title,
                'channel_name': obj.channel_name,
                'view_count': (obj.metadata or {}).get('view_count'),
                'duration': (obj.metadata or {}).get('duration'),
                'thumbnail_url': (obj.metadata or {}).get('thumbnail_url'),
                'transcript': obj.transcript or '',
                'transcript_json': obj.transcript_json,
                'topic': primary_topic,
                'topic_tags': tags,
                'fetched_at': (obj.metadata or {}).get('fetched_at'),
            }

            results.setdefault(primary_topic, []).append(item)
            exported += 1

        # Wrap in the standard state envelope
        state = {
            'topics': [
                {'name': topic, 'limit': len(items), 'processed': len(items)}
                for topic, items in results.items()
            ],
            'results': results,
            'current_topic_index': len(results),
            '_export_meta': {
                'total_exported': exported,
                'total_skipped': skipped,
                'topics_in_export': list(results.keys()),
            },
        }

        json_str = json.dumps(state, ensure_ascii=False, indent=indent)

        if to_stdout:
            sys.stdout.write(json_str)
            sys.stdout.write('\n')
            self.stderr.write(self.style.SUCCESS(
                f'Exported {exported} videos across {len(results)} topic(s). '
                f'Skipped {skipped}.'
            ))
            return

        # Write to file
        out_dir = os.path.dirname(output_path)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(json_str)
            f.flush()
            os.fsync(f.fileno())

        self.stdout.write(self.style.SUCCESS(
            f'Exported {exported} videos across {len(results)} topic(s) → {output_path}'
        ))
        if skipped:
            self.stdout.write(self.style.NOTICE(f'Skipped {skipped} videos (topic filter)'))
