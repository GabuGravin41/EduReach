#!/bin/bash

set -e

echo "Starting EduReach Backend..."

# Run database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn (this must succeed)
echo "Starting Gunicorn server..."
exec gunicorn edureach_project.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
