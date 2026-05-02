#!/bin/bash

set -e

echo "Starting EduReach Backend..."

# Run database migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# ── TEMP: seed commands disabled to reduce startup RAM spike on Render starter tier.
# ── Re-enable once migrated to Contabo VPS (data is already seeded in production DB).
# python manage.py seed_kenyan_users || echo "Warning: seed_kenyan_users failed (non-fatal)"
# python manage.py seed_community_data || echo "Warning: seed_community_data failed (non-fatal)"
# python manage.py seed_analytics_data || echo "Warning: seed_analytics_data failed (non-fatal)"

# Start Gunicorn
# ── TEMP: 1 worker + gthread to fit Render starter 512MB RAM limit.
# ── On Contabo VPS restore to: --workers 2 --threads 2 (remove --worker-class gthread)
echo "Starting Gunicorn server..."
exec gunicorn edureach_project.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --worker-class gthread \
    --workers 1 \
    --threads 4 \
    --max-requests 200 \
    --max-requests-jitter 20 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level warning
