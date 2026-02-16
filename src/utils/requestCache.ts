import type { InternalAxiosRequestConfig } from 'axios';

type CachedEntry = {
  data: unknown;
  status: number;
  cachedAt: number;
};

const CACHE_PREFIX = 'edureach:api-cache:v1:';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

const AUTH_EXCLUDED_PATHS = [
  '/auth/login/',
  '/auth/registration/',
  '/auth/logout/',
  '/auth/token/refresh/',
];

const canUseStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
};

export const buildRequestCacheKey = (config: InternalAxiosRequestConfig): string => {
  const method = String(config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params ? stableStringify(config.params) : '';
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('access_token') || '') : '';
  const tokenSuffix = token ? token.slice(-12) : 'anon';
  return `${CACHE_PREFIX}${method}:${url}?${params}:u:${tokenSuffix}`;
};

export const shouldCacheRequest = (config: InternalAxiosRequestConfig): boolean => {
  const method = String(config.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  const url = config.url || '';
  return !AUTH_EXCLUDED_PATHS.some((path) => url.includes(path));
};

export const writeCachedResponse = (
  key: string,
  payload: { data: unknown; status: number }
): void => {
  if (!canUseStorage()) return;
  try {
    const entry: CachedEntry = {
      data: payload.data,
      status: payload.status,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore quota/storage errors.
  }
};

export const readCachedResponse = (
  key: string,
  maxAgeMs: number = DEFAULT_TTL_MS
): { data: unknown; status: number; stale: boolean } | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed || typeof parsed.cachedAt !== 'number') return null;
    const age = Date.now() - parsed.cachedAt;
    return {
      data: parsed.data,
      status: parsed.status || 200,
      stale: age > maxAgeMs,
    };
  } catch {
    return null;
  }
};

export const isLikelyNetworkError = (error: { response?: unknown; code?: string; message?: string }): boolean => {
  if (error.response) return false;
  if (!navigator.onLine) return true;
  const msg = String(error.message || '').toLowerCase();
  return error.code === 'ERR_NETWORK' || msg.includes('network') || msg.includes('failed to fetch');
};

