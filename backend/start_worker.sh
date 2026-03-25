#!/bin/bash
set -e

echo "Starting EduReach Celery Worker..."

exec celery -A edureach_project worker \
    --loglevel=info \
    --concurrency=2 \
    --max-tasks-per-child=50 \
    --without-gossip \
    --without-mingle \
    --without-heartbeat
