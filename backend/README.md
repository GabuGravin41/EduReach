# EduReach Backend API

A robust Django REST API backend for the EduReach educational platform with AI-powered features using Google's Gemini API.

## Features

- **User Management**: Custom user model with subscription tiers (Free, Learner, Pro, Pro Plus, Admin)
- **Course Management**: Create and manage courses with lessons and track user progress
- **Assessments**: Create quizzes and exams with automatic grading
- **Community**: Social features with posts, comments, and likes
- **AI Service**: Secure proxy for Gemini API with quiz generation, chat, study plans, and concept explanations
- **JWT Authentication**: Secure token-based authentication
- **CORS Enabled**: Ready for React frontend integration

## Project Structure

```
backend/
├── edureach_project/       # Main project configuration
│   ├── settings.py        # Django settings
│   ├── urls.py            # Main URL routing
│   ├── wsgi.py            # WSGI configuration
│   └── asgi.py            # ASGI configuration
├── users/                  # User management app
├── courses/                # Course management app
├── assessments/            # Quiz and exam app
├── community/              # Social features app
├── ai_service/             # AI/Gemini API proxy
├── manage.py               # Django management script
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables (create from .env.example)
```

## Installation

### 1. Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### 2. Clone and Setup

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```bash
# Copy the example file
copy .env.example .env
```

Edit `.env` and add your configurations:

```env
SECRET_KEY=your-django-secret-key-generate-a-strong-one
DEBUG=True
GEMINI_API_KEY=your-google-gemini-api-key
```

**Getting a Gemini API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into your `.env` file

### 4. Database Setup

```bash
# Create database tables
python manage.py makemigrations
python manage.py migrate

# Create a superuser for admin access
python manage.py createsuperuser
```

### 5. Run the Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/`

## API Endpoints

### Authentication
- `POST /api/auth/registration/` - Register new user
- `POST /api/auth/login/` - Login (returns JWT tokens)
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/users/me/` - Get current user profile
- `PUT /api/users/me/` - Update current user profile
- `POST /api/users/upgrade_tier/` - Upgrade user tier

### Courses
- `GET /api/courses/` - List all public courses
- `POST /api/courses/` - Create a new course
- `GET /api/courses/{id}/` - Get course details
- `PUT /api/courses/{id}/` - Update course
- `DELETE /api/courses/{id}/` - Delete course
- `GET /api/courses/{id}/lessons/` - Get course lessons
- `GET /api/courses/my_courses/` - Get user's created courses
- `POST /api/progress/start_course/` - Start tracking progress
- `POST /api/progress/{id}/complete_lesson/` - Mark lesson as complete

### Assessments
- `GET /api/assessments/` - List all public assessments
- `POST /api/assessments/` - Create a new assessment
- `GET /api/assessments/{id}/` - Get assessment details
- `GET /api/assessments/{id}/questions/` - Get assessment questions
- `POST /api/assessments/{id}/start/` - Start assessment attempt
- `POST /api/assessments/{id}/submit/` - Submit assessment answers
- `GET /api/assessments/my_assessments/` - Get user's created assessments
- `GET /api/attempts/history/` - Get user's assessment history

### Community
- `GET /api/posts/` - List all posts
- `POST /api/posts/` - Create a new post
- `GET /api/posts/{id}/` - Get post details
- `PUT /api/posts/{id}/` - Update post
- `DELETE /api/posts/{id}/` - Delete post
- `POST /api/posts/{id}/comment/` - Add comment to post
- `POST /api/posts/{id}/like/` - Toggle like on post
- `GET /api/posts/my_posts/` - Get user's posts

### AI Service
- `POST /api/ai/generate-quiz/` - Generate quiz from transcript
  ```json
  {
    "transcript": "string",
    "num_questions": 5,
    "difficulty": "medium"
  }
  ```
- `POST /api/ai/chat/` - Chat with AI assistant
  ```json
  {
    "message": "string",
    "context": "optional context"
  }
  ```
- `POST /api/ai/study-plan/` - Generate personalized study plan
  ```json
  {
    "topic": "string",
    "duration_weeks": 4,
    "skill_level": "beginner",
    "goals": "optional goals"
  }
  ```
- `POST /api/ai/explain/` - Get concept explanation
  ```json
  {
    "concept": "string",
    "detail_level": "detailed"
  }
  ```

## Admin Panel

Access the Django admin panel at `http://localhost:8000/admin/`

Use the superuser credentials you created during setup.

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Generate a strong SECRET_KEY** for production
3. **Set DEBUG=False** in production
4. **Use HTTPS** in production
5. **Keep GEMINI_API_KEY secure** - never expose it to the frontend
6. **Use environment-specific settings** for different deployments

## Testing API with Tools

### Using cURL
```bash
# Register a user
curl -X POST http://localhost:8000/api/auth/registration/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password1":"testpass123","password2":"testpass123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

### Using Postman or Thunder Client
1. Import the API endpoints
2. Set Authorization header: `Bearer <your-jwt-token>`
3. Test each endpoint

## Deployment

### Preparation for Production

1. Update `settings.py`:
   - Set `DEBUG = False`
   - Configure `ALLOWED_HOSTS`
   - Use PostgreSQL instead of SQLite
   - Configure static file serving

2. Collect static files:
   ```bash
   python manage.py collectstatic
   ```

3. Use production-grade server (Gunicorn, uWSGI)

4. Set up HTTPS with SSL certificate

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure virtual environment is activated
2. **Database errors**: Run migrations: `python manage.py migrate`
3. **CORS errors**: Check CORS settings in `settings.py`
4. **Gemini API errors**: Verify API key in `.env` file

## Contributing

1. Create a new branch for features
2. Follow Django coding standards
3. Write tests for new features
4. Update documentation

## License

MIT License - feel free to use this for your projects!

## Support

For issues and questions, please create an issue in the repository.
