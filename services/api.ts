import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  buildRequestCacheKey,
  isLikelyNetworkError,
  readCachedResponse,
  shouldCacheRequest,
  writeCachedResponse,
} from '../src/utils/requestCache';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (shouldCacheRequest(config)) {
      (config as any)._cacheKey = buildRequestCacheKey(config as any);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    const config = response.config as any;
    if (config?._cacheKey && shouldCacheRequest(config)) {
      writeCachedResponse(config._cacheKey, { data: response.data, status: response.status });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('network:online'));
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // No refresh token available, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (originalRequest?._cacheKey && shouldCacheRequest(originalRequest)) {
      const networkDown = isLikelyNetworkError({
        response: error.response,
        code: error.code,
        message: error.message,
      });
      const serverError = (error.response?.status || 0) >= 500;
      if (networkDown || serverError) {
        const cached = readCachedResponse(originalRequest._cacheKey);
        if (cached) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('network:offline'));
          }
          return Promise.resolve({
            data: cached.data,
            status: cached.status,
            statusText: cached.stale ? 'OK (stale cache)' : 'OK (cache)',
            headers: { 'x-edureach-cache': cached.stale ? 'stale' : 'hit' },
            config: originalRequest,
            request: undefined,
          });
        }
      }
    }

    return Promise.reject(error);
  }
);

const apiClient = {
  get: async (url: string) => {
    return axiosInstance.get(url);
  },
  post: async (url: string, data: any) => {
    return axiosInstance.post(url, data);
  },
  put: async (url: string, data: any) => {
    return axiosInstance.put(url, data);
  },
  patch: async (url: string, data: any) => {
    return axiosInstance.patch(url, data);
  },
  delete: async (url: string) => {
    return axiosInstance.delete(url);
  },
};

export default apiClient;