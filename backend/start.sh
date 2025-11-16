#!/bin/bash

# Exit on error
set -e

echo "Starting EduReach Backend Deployment..."

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if it doesn't exist (optional)
echo "Checking for superuser..."
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    print("Creating admin user...")
    User.objects.create_superuser('admin', 'admin@edureach.com', 'admin123')
    print("Admin user created!")
else:
    print("Admin user already exists")
END

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn edureach_project.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
