#!/bin/bash

echo "Starting EduReach Backend..."

# Run database migrations (don't exit on error)
python manage.py migrate --noinput || echo "Migration failed, continuing..."

# Collect static files (don't exit on error)
python manage.py collectstatic --noinput || echo "Static files collection failed, continuing..."

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
