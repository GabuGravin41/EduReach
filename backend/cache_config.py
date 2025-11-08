# Django Cache Configuration for EduReach
# Add this to your settings.py

import os

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            }
        },
        'KEY_PREFIX': 'edureach',
        'TIMEOUT': 300,  # 5 minutes default
    },
    # Separate cache for sessions
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/2'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'edureach_session',
        'TIMEOUT': 86400,  # 24 hours
    },
    # Cache for API responses
    'api': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/3'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'edureach_api',
        'TIMEOUT': 600,  # 10 minutes
    }
}

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 86400  # 24 hours

# Cache middleware settings
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'edureach_page'

# Add to MIDDLEWARE (near the top)
CACHE_MIDDLEWARE = [
    'django.middleware.cache.UpdateCacheMiddleware',
    # ... other middleware ...
    'django.middleware.cache.FetchFromCacheMiddleware',
]

# Database connection pooling (if using PostgreSQL)
if os.getenv('DATABASE_URL'):
    DATABASES['default']['CONN_MAX_AGE'] = 600  # 10 minutes
    DATABASES['default']['OPTIONS'] = {
        'MAX_CONNS': 20,
        'MIN_CONNS': 5,
    }

# Static files optimization
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# Compression settings
COMPRESS_ENABLED = True
COMPRESS_OFFLINE = True
COMPRESS_CSS_FILTERS = [
    'compressor.filters.css_default.CssAbsoluteFilter',
    'compressor.filters.cssmin.rCSSMinFilter',
]
COMPRESS_JS_FILTERS = [
    'compressor.filters.jsmin.JSMinFilter',
]
