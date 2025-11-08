# Quick Setup Guide for EduReach Backend

## Step-by-Step Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Create Environment File

```bash
# Copy the example file
copy .env.example .env
```

Edit the `.env` file and add:
- Your Django `SECRET_KEY` (generate one using: https://djecrety.ir/)
- Your `GEMINI_API_KEY` from Google AI Studio

### 3. Initialize Database

```bash
# Create migrations for all apps
python manage.py makemigrations users
python manage.py makemigrations courses
python manage.py makemigrations assessments
python manage.py makemigrations community

# Apply migrations
python manage.py migrate
```

### 4. Create Admin User

```bash
python manage.py createsuperuser
```

Follow the prompts to create your admin account.

### 5. Start Development Server

```bash
python manage.py runserver
```

### 6. Test the API

Visit:
- API Root: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

### 7. Test with Frontend

Ensure your React frontend is configured to connect to:
```
http://localhost:8000
```

## Available API Endpoints

### Core Endpoints
- **Admin**: `/admin/`
- **API Root**: `/api/`

### Authentication
- **Register**: `POST /api/auth/registration/`
- **Login**: `POST /api/auth/login/`
- **Logout**: `POST /api/auth/logout/`

### Users
- **Profile**: `GET/PUT /api/users/me/`
- **Upgrade Tier**: `POST /api/users/upgrade_tier/`

### Courses
- **List/Create**: `GET/POST /api/courses/`
- **Detail**: `GET/PUT/DELETE /api/courses/{id}/`
- **Lessons**: `GET /api/courses/{id}/lessons/`

### Assessments
- **List/Create**: `GET/POST /api/assessments/`
- **Start**: `POST /api/assessments/{id}/start/`
- **Submit**: `POST /api/assessments/{id}/submit/`

### Community
- **Posts**: `GET/POST /api/posts/`
- **Like**: `POST /api/posts/{id}/like/`
- **Comment**: `POST /api/posts/{id}/comment/`

### AI Services
- **Generate Quiz**: `POST /api/ai/generate-quiz/`
- **Chat**: `POST /api/ai/chat/`
- **Study Plan**: `POST /api/ai/study-plan/`
- **Explain Concept**: `POST /api/ai/explain/`

## Testing Authentication

1. **Register a new user**:
```bash
curl -X POST http://localhost:8000/api/auth/registration/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password1": "SecurePass123!",
    "password2": "SecurePass123!"
  }'
```

2. **Login to get JWT tokens**:
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

3. **Use the access token** in subsequent requests:
```bash
curl -X GET http://localhost:8000/api/users/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common Issues and Solutions

### Issue: ModuleNotFoundError
**Solution**: Ensure virtual environment is activated and all packages are installed:
```bash
pip install -r requirements.txt
```

### Issue: No such table errors
**Solution**: Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

### Issue: CORS errors from frontend
**Solution**: Check that your frontend URL is in `CORS_ALLOWED_ORIGINS` in `settings.py`

### Issue: Gemini API errors
**Solution**: 
1. Verify your API key is correct in `.env`
2. Check your API key has not exceeded quota
3. Visit Google AI Studio to check API status

## Next Steps

1. **Populate with test data**: Use Django admin or create fixtures
2. **Test API endpoints**: Use Postman, Thunder Client, or cURL
3. **Connect React frontend**: Update frontend API base URL
4. **Customize**: Modify models, views, or add new features

## Production Deployment

When ready for production:
1. Set `DEBUG=False` in settings
2. Use PostgreSQL instead of SQLite
3. Set up proper static file serving
4. Use Gunicorn/uWSGI as WSGI server
5. Set up HTTPS with SSL certificate
6. Configure allowed hosts properly

---

Need help? Check the main README.md or create an issue!
