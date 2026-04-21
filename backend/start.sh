#!/bin/bash

set -e

echo "Starting EduReach Backend..."

# Run database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Seed realistic demo data (idempotent — safe to run on every deploy)
echo "Seeding demo users and courses..."
python manage.py seed_kenyan_users || echo "Warning: seed_kenyan_users failed (non-fatal)"

echo "Seeding community data..."
python manage.py seed_community_data || echo "Warning: seed_community_data failed (non-fatal)"

echo "Seeding analytics data..."
python manage.py seed_analytics_data || echo "Warning: seed_analytics_data failed (non-fatal)"

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
