#!/bin/bash

set -e

echo "Starting EduReach Backend..."

# Run database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn — tuned for Contabo VPS (2 vCPU, 4GB RAM)
echo "Starting Gunicorn server..."
exec gunicorn edureach_project.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --threads 2 \
    --max-requests 500 \
    --max-requests-jitter 50 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level warning
