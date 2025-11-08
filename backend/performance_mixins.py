# Performance optimization mixins for Django views

from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
import hashlib
import json
from functools import wraps
import time

class CacheOptimizedMixin:
    """
    Mixin to add caching capabilities to ViewSets
    """
    cache_timeout = 300  # 5 minutes default
    cache_key_prefix = 'api'
    
    def get_cache_key(self, request, *args, **kwargs):
        """Generate a unique cache key for the request"""
        # Include user ID, query params, and view name
        user_id = getattr(request.user, 'id', 'anonymous')
        query_params = sorted(request.GET.items())
        view_name = self.__class__.__name__
        
        key_data = {
            'user_id': user_id,
            'view': view_name,
            'params': query_params,
            'args': args,
            'kwargs': kwargs
        }
        
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"{self.cache_key_prefix}:{view_name}:{key_hash}"
    
    def get_cached_response(self, request, *args, **kwargs):
        """Try to get response from cache"""
        cache_key = self.get_cache_key(request, *args, **kwargs)
        return cache.get(cache_key)
    
    def set_cached_response(self, request, response_data, *args, **kwargs):
        """Cache the response"""
        cache_key = self.get_cache_key(request, *args, **kwargs)
        cache.set(cache_key, response_data, self.cache_timeout)
    
    def invalidate_cache_pattern(self, pattern):
        """Invalidate cache keys matching a pattern"""
        # This would require Redis SCAN command
        # For now, we'll use a simple approach
        cache.delete_many([pattern])

class QueryOptimizedMixin:
    """
    Mixin to optimize database queries
    """
    select_related_fields = []
    prefetch_related_fields = []
    
    def get_optimized_queryset(self, queryset):
        """Apply query optimizations"""
        if self.select_related_fields:
            queryset = queryset.select_related(*self.select_related_fields)
        
        if self.prefetch_related_fields:
            queryset = queryset.prefetch_related(*self.prefetch_related_fields)
        
        return queryset
    
    def get_queryset(self):
        """Override to apply optimizations"""
        queryset = super().get_queryset()
        return self.get_optimized_queryset(queryset)

class PaginationOptimizedMixin:
    """
    Mixin for optimized pagination
    """
    def get_paginated_response(self, data):
        """Add performance metadata to paginated responses"""
        response = super().get_paginated_response(data)
        
        # Add cache headers
        response['Cache-Control'] = f'public, max-age={getattr(self, "cache_timeout", 300)}'
        response['ETag'] = hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()
        
        return response

def cache_api_response(timeout=300, key_prefix='api'):
    """
    Decorator for caching API responses
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Generate cache key
            user_id = getattr(request.user, 'id', 'anonymous')
            query_params = sorted(request.GET.items())
            
            key_data = {
                'user_id': user_id,
                'view': view_func.__name__,
                'params': query_params,
                'args': args,
                'kwargs': kwargs
            }
            
            key_string = json.dumps(key_data, sort_keys=True)
            cache_key = f"{key_prefix}:{hashlib.md5(key_string.encode()).hexdigest()}"
            
            # Try to get from cache
            cached_response = cache.get(cache_key)
            if cached_response:
                return Response(cached_response)
            
            # Execute view
            response = view_func(self, request, *args, **kwargs)
            
            # Cache successful responses
            if response.status_code == 200:
                cache.set(cache_key, response.data, timeout)
            
            return response
        
        return wrapper
    return decorator

def performance_monitor(view_func):
    """
    Decorator to monitor view performance
    """
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        start_time = time.time()
        
        response = view_func(self, request, *args, **kwargs)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Log slow requests (> 1 second)
        if execution_time > 1.0:
            print(f"SLOW REQUEST: {view_func.__name__} took {execution_time:.2f}s")
        
        # Add performance header
        if hasattr(response, '__setitem__'):
            response['X-Response-Time'] = f"{execution_time:.3f}s"
        
        return response
    
    return wrapper

class AsyncOptimizedMixin:
    """
    Mixin for async operations
    """
    async def async_operation(self, operation_func, *args, **kwargs):
        """Execute operation asynchronously"""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, operation_func, *args, **kwargs)

# Usage examples:

# In your ViewSets:
"""
from .performance_mixins import CacheOptimizedMixin, QueryOptimizedMixin, cache_api_response

class OptimizedAssessmentViewSet(CacheOptimizedMixin, QueryOptimizedMixin, viewsets.ModelViewSet):
    cache_timeout = 600  # 10 minutes
    select_related_fields = ['user', 'course']
    prefetch_related_fields = ['questions', 'attempts']
    
    @cache_api_response(timeout=300)
    @performance_monitor
    def list(self, request):
        # Your list logic here
        return super().list(request)
    
    def create(self, request):
        # Invalidate related caches after creation
        response = super().create(request)
        if response.status_code == 201:
            self.invalidate_cache_pattern('api:AssessmentViewSet:*')
        return response
"""
