#!/bin/bash
set -e

echo "Starting EduReach Celery Worker..."

# TEMP: concurrency=1 to fit Render starter RAM. Restore to --concurrency=2 on Contabo VPS.
exec celery -A edureach_project worker \
    --loglevel=warning \
    --concurrency=1 \
    --max-tasks-per-child=50 \
    --without-gossip \
    --without-mingle \
    --without-heartbeat
