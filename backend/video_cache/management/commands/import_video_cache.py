"""
Import JSON output produced by fetch_videos_by_topic into the VideoCache model.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Import video cache JSON into the VideoCache Django model'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to JSON file produced by fetch_videos_by_topic')

    def handle(self, *args, **options):
        json_file = options['json_file']
        if not os.path.isfile(json_file):
            self.stderr.write('JSON file not found: ' + json_file)
            return

        with open(json_file, 'r', encoding='utf-8') as f:
            state = json.load(f)

        from video_cache.models import VideoCache
        from video_cache.utils import import_state_dict

        total = import_state_dict(state, VideoCache)
        self.stdout.write(self.style.SUCCESS(f'Imported {total} items into VideoCache'))
