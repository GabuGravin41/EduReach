"""
Django settings for edureach_project.
"""

from pathlib import Path
from dotenv import load_dotenv
import os
import sys
import re
from datetime import timedelta

# Load environment variables
load_dotenv()

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').strip().lower()
IS_RUNSERVER = 'runserver' in sys.argv
IS_COLLECTSTATIC = 'collectstatic' in sys.argv
MANAGEMENT_COMMAND = sys.argv[1] if len(sys.argv) > 1 else ''
LOCAL_SAFE_COMMANDS = {
    'runserver',
    'migrate',
    'makemigrations',
    'check',
    'shell',
    'test',
    'createsuperuser',
    'collectstatic',
}
IS_LOCAL_SAFE_COMMAND = MANAGEMENT_COMMAND in LOCAL_SAFE_COMMANDS


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if ENVIRONMENT != 'production':
        SECRET_KEY = 'dev-insecure-key-only-for-development'
    else:
        raise ValueError("SECRET_KEY environment variable must be set in production")

# SECURITY WARNING: don't run with debug turned on in production!
default_debug = True if (ENVIRONMENT != 'production' or IS_RUNSERVER) else False
DEBUG = _env_bool('DEBUG', default_debug)
if DEBUG and ENVIRONMENT == 'production' and not IS_RUNSERVER:
    raise ValueError("DEBUG must be False in production")
IS_STRICT_PRODUCTION = (ENVIRONMENT == 'production' and not DEBUG and not IS_RUNSERVER)

# Allowed hosts from environment variable (comma-separated)
allowed_hosts_env = os.environ.get(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1' if not DEBUG else 'localhost,127.0.0.1,*.localhost'
)
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',') if host.strip()]

# Validate ALLOWED_HOSTS in production
if IS_STRICT_PRODUCTION and len(ALLOWED_HOSTS) == 0:
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
    'payments.apps.PaymentsConfig',
    'study_groups.apps.StudyGroupsConfig',
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

# Check if DATABASE_URL is provided for PostgreSQL
db_url = os.environ.get('DATABASE_URL')

if db_url and not IS_COLLECTSTATIC:
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
    if IS_STRICT_PRODUCTION and not IS_COLLECTSTATIC:
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
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
os.makedirs(STATIC_ROOT, exist_ok=True)  # Avoid WhiteNoise "No directory" warning
# Use plain StaticFilesStorage when DEBUG is on or when running runserver locally, so Django admin
# works without running collectstatic. Manifest storage is only for deployed production.
if DEBUG or IS_RUNSERVER:
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
else:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# When running runserver, we need to serve static files (admin CSS/JS) even if DEBUG is False.
# urls.py will add the static route when this is True; then run: python manage.py collectstatic --noinput
SERVE_STATIC_WHEN_RUNSERVER = IS_RUNSERVER

# Media uploads (assessment answer images)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', os.path.join(BASE_DIR, 'media'))
# Temporary launch-safe option to let Django serve uploaded media in production.
# For long-term scale, switch to object storage (e.g., S3/Cloudinary).
SERVE_MEDIA_FILES = _env_bool('SERVE_MEDIA_FILES', DEBUG)

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

# dj-rest-auth / allauth configuration
REST_AUTH_REGISTER_SERIALIZERS = {
    'REGISTER_SERIALIZER': 'users.serializers_registration.CustomRegisterSerializer',
}

# CORS Settings
# Development origins (always allowed in dev)
development_cors = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Production origins from environment (simple + resilient)
cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS', '').strip()
parsed_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
valid_origins = [o for o in parsed_origins if re.match(r'^https?://', o)]
invalid_origins = [o for o in parsed_origins if o not in valid_origins]

# Invalid entries (e.g. *.onrender.com) are ignored; only full origins like https://example.com are used.
if invalid_origins:
    import warnings
    warnings.warn(
        "CORS_ALLOWED_ORIGINS: ignoring invalid entries (use full origins like https://example.com): " + ", ".join(invalid_origins),
        UserWarning,
        stacklevel=0,
    )
# Strict: in production require at least one valid origin when not in a safe command
if IS_STRICT_PRODUCTION and not IS_LOCAL_SAFE_COMMAND and not valid_origins:
    raise ValueError(
        "CORS_ALLOWED_ORIGINS must contain full origins like "
        "https://example.com,https://www.example.com (wildcards like *.onrender.com are not allowed)"
    )

# Always include localhost for dev/testing convenience.
# Invalid values (e.g. *.onrender.com) are safely ignored outside strict runtime.
if DEBUG or IS_LOCAL_SAFE_COMMAND:
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(valid_origins + development_cors))
else:
    CORS_ALLOWED_ORIGINS = valid_origins

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

# Let CommonMiddleware normalize URLs (e.g. `/api/foo` → `/api/foo/`)
# This avoids unexpected 404s when a trailing slash is missing.
APPEND_SLASH = True

# OpenRouter API Configuration (PRIMARY AI PROVIDER)
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
# Default to Gemini 2.0 Flash on OpenRouter for fast, long-context text + (future) multimodal.
# Can be overridden per-deployment by setting OPENROUTER_MODEL env var.
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')
_raw_openrouter_api_url = os.environ.get(
    'OPENROUTER_API_URL',
    'https://openrouter.ai/api/v1/chat/completions',
).strip()
# Canonicalize away api.openrouter.ai (DNS issues in some networks)
OPENROUTER_API_URL = _raw_openrouter_api_url.replace(
    'api.openrouter.ai',
    'openrouter.ai',
)
PREFER_OPENROUTER = os.environ.get('PREFER_OPENROUTER', 'True') == 'True'

# Validate OpenRouter configuration
if not OPENROUTER_API_KEY:
    if not IS_COLLECTSTATIC and IS_STRICT_PRODUCTION:
        raise ValueError("OPENROUTER_API_KEY environment variable must be set in production")
    elif DEBUG:
        OPENROUTER_API_KEY = 'dev-key-not-configured'
    else:
        OPENROUTER_API_KEY = 'dummy-key-for-build'

# Gemini API Configuration (OPTIONAL - for future use with paid plan)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', None)
GEMINI_MODEL_NAME = os.environ.get('GEMINI_MODEL_NAME', 'gemini-2.5-flash')

# AI pipeline timeouts (keep under Gunicorn --timeout 120)
# Per-provider timeouts so we fail fast and can try fallback
GEMINI_REQUEST_TIMEOUT_SECONDS = int(os.environ.get('GEMINI_REQUEST_TIMEOUT_SECONDS', '35'))
OPENROUTER_CONNECT_TIMEOUT_SECONDS = float(os.environ.get('OPENROUTER_CONNECT_TIMEOUT_SECONDS', '8'))
OPENROUTER_READ_TIMEOUT_SECONDS = float(os.environ.get('OPENROUTER_READ_TIMEOUT_SECONDS', '45'))
# Long-running requests (e.g. quiz) can use longer read timeout
OPENROUTER_READ_TIMEOUT_LONG_SECONDS = float(os.environ.get('OPENROUTER_READ_TIMEOUT_LONG_SECONDS', '90'))
# Total deadline for entire call_ai() (Gemini + fallback); stay under worker timeout
AI_REQUEST_DEADLINE_SECONDS = int(os.environ.get('AI_REQUEST_DEADLINE_SECONDS', '100'))

# Enterprise inquiry email routing
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@edureach.app')
ENTERPRISE_INQUIRY_EMAIL = os.environ.get('ENTERPRISE_INQUIRY_EMAIL', 'hello@edureach.app')

# ── Email backend ────────────────────────────────────────────────────────────
# Set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend in .env
# and configure the SMTP_* vars below to enable real email delivery.
# Until then, emails are printed to the console (safe default for development).
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'apikey')  # SendGrid uses 'apikey'
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')  # SendGrid API key

# Paystack payment integration
PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY', '')

# Frontend URL for email links (study reminders, etc.)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://edureach.app')

# CSRF trusted origins — must include every frontend domain that POSTs to the API
# Reuse the same origins already validated for CORS.
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(
    valid_origins + [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
))

# Security settings for production
if not DEBUG:
    # Railway handles SSL, don't redirect
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('REDIS_URL', os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'))
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
