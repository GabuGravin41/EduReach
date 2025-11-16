"""
Django settings for edureach_project.
"""

from pathlib import Path
from dotenv import load_dotenv
import os
from datetime import timedelta

# Load environment variables
load_dotenv()

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if os.environ.get('ENVIRONMENT') != 'production':
        SECRET_KEY = 'dev-insecure-key-only-for-development'
    else:
        raise ValueError("SECRET_KEY environment variable must be set in production")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
if DEBUG and os.environ.get('ENVIRONMENT') == 'production':
    raise ValueError("DEBUG must be False in production")

# Allowed hosts from environment variable (comma-separated)
allowed_hosts_env = os.environ.get(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1' if not DEBUG else 'localhost,127.0.0.1,*.localhost'
)
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',') if host.strip()]

# Validate ALLOWED_HOSTS in production
if not DEBUG and len(ALLOWED_HOSTS) == 0:
    raise ValueError("ALLOWED_HOSTS must be configured in production environment")

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'corsheaders',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'django.contrib.sites',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    
    # Local apps
    'users.apps.UsersConfig',
    'courses.apps.CoursesConfig',
    'assessments.apps.AssessmentsConfig',
    'community.apps.CommunityConfig',
    'ai_service.apps.AiServiceConfig',
    'notes.apps.NotesConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add whitenoise for static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'edureach_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'edureach_project.wsgi.application'

# Database Configuration
import sys

# Check if DATABASE_URL is provided for PostgreSQL
db_url = os.environ.get('DATABASE_URL')

if db_url and 'collectstatic' not in sys.argv:
    # Production with PostgreSQL (RECOMMENDED for Railway)
    try:
        import dj_database_url
        DATABASES = {
            'default': dj_database_url.config(
                default=db_url,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
    except ImportError:
        raise ImportError("dj-database-url is required when DATABASE_URL is set")
else:
    # SQLite fallback (development only - NOT recommended for production)
    # For Railway: Add PostgreSQL database service and it will auto-set DATABASE_URL
    sqlite_path = os.environ.get('SQLITE_PATH', str(BASE_DIR / 'db.sqlite3'))
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': sqlite_path,
        }
    }
    
    # Warning for production
    if not DEBUG and 'collectstatic' not in sys.argv:
        import warnings
        warnings.warn(
            "WARNING: Using SQLite in production without DATABASE_URL. "
            "Data will be lost on container restart! "
            "Add PostgreSQL database service in Railway for data persistence.",
            RuntimeWarning
        )

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Whitenoise configuration for production
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files (user uploads)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Ensure logs directory exists (prevents FileHandler errors on first run)
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'MAX_PAGE_SIZE': 100,  # Prevent requesting huge datasets
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Anonymous users: 100 requests per hour
        'user': '1000/hour'  # Authenticated users: 1000 requests per hour
    }
}

# Simple JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

# CORS Settings
# Development origins (always allowed in dev)
development_cors = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Production origins from environment
if DEBUG:
    CORS_ALLOWED_ORIGINS = development_cors
else:
    # Don't validate CORS during collectstatic
    import sys
    if 'collectstatic' not in sys.argv:
        cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS', '').strip()
        if not cors_origins_env:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS environment variable must be set in production. "
                "Format: https://yourdomain.com,https://www.yourdomain.com"
            )
        CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
    else:
        # During collectstatic, use a dummy value
        CORS_ALLOWED_ORIGINS = ['*']

# Allow Capacitor mobile app origins
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^capacitor://localhost$",
    r"^http://localhost$",
    r"^ionic://localhost$",
]

CORS_ALLOW_CREDENTIALS = True

# dj-rest-auth settings
SITE_ID = 1
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_HTTPONLY': False,
    'USER_DETAILS_SERIALIZER': 'users.serializers.UserSerializer',
}

ACCOUNT_EMAIL_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_EMAIL_VERIFICATION = 'none'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'error.log'),
            'formatter': 'verbose',
        },
        'django_file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG' if DEBUG else 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'django_file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'WARNING',
            'propagate': False,
        },
    },
}

# Gemini API Configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL_NAME = os.environ.get('GEMINI_MODEL_NAME', 'gemini-2.5-flash')

# Fix for 405 error - disable automatic slash appending
APPEND_SLASH = False

# Gemini API Configuration with validation
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    # Don't validate during collectstatic
    import sys
    if 'collectstatic' not in sys.argv and not DEBUG:
        raise ValueError("GEMINI_API_KEY environment variable must be set in production")
    elif DEBUG:
        GEMINI_API_KEY = 'dev-key-not-configured'
    else:
        GEMINI_API_KEY = 'dummy-key-for-build'

GEMINI_MODEL_NAME = os.environ.get('GEMINI_MODEL_NAME', 'gemini-2.5-flash')

# Security settings for production
if not DEBUG:
    # Railway handles SSL, don't redirect
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
