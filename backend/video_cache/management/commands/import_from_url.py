"""
Download a JSON state file from a secure URL and import into VideoCache.

Usage:
  python manage.py import_from_url https://example.com/signed-url

The URL should point to the JSON produced by `fetch_videos_by_topic`.
"""
from __future__ import annotations

import os
import sys
import json
import requests

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Download a JSON state file from URL and import into VideoCache'

    def add_arguments(self, parser):
        parser.add_argument('url', type=str, help='Signed URL to fetch JSON state from')
        parser.add_argument('--timeout', type=int, default=30, help='HTTP timeout in seconds')

    def handle(self, *args, **options):
        url = options['url']
        timeout = options.get('timeout', 30)

        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
        except Exception as e:
            self.stderr.write(f'Failed to download JSON from URL: {e}')
            sys.exit(2)

        try:
            state = resp.json()
        except Exception as e:
            self.stderr.write(f'Failed to parse JSON: {e}')
            sys.exit(3)

        from video_cache.models import VideoCache
        from video_cache.utils import import_state_dict

        total = import_state_dict(state, VideoCache)
        self.stdout.write(self.style.SUCCESS(f'Imported {total} items into VideoCache from URL'))
