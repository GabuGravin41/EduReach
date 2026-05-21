import apiClient from './api';
import { API_ENDPOINTS, API_CONFIG } from '../config/api';

export type UserTier = 'free' | 'learner' | 'pro' | 'pro_plus' | 'admin';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password1: string;
  password2: string;
  first_name: string;
  last_name: string;
  learning_goal?: string;
  learner_type?: string;
  interests?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  tier: UserTier;
  bio?: string;
  avatar?: string;
  xp_points: number;
  level: number;
  show_xp_publicly: boolean;
  total_time_spent_seconds: number;
  learning_goal?: string;
  learner_type?: string;
  interests?: string;
  profile_cover?: string;
  created_at: string;
  date_joined?: string;
  // Trial fields
  is_trial_active?: boolean;
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
  // Onboarding & extended profile
  onboarding_completed?: boolean;
  track?: string;
  degree_course?: string;
  year_of_study?: string;
  phone_number?: string;
  country?: string;
}

export interface LeaderboardData {
  top_users: User[];
  user_rank: number | null;
  user_stats: User;
}

/** Minimal user info for challenge-a-friend list. */
export interface ChallengeableUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar: string | null;
}

const CACHED_USER_KEY = 'cached_user';

// Evict any stale API cache entries written by the old localStorage-based
// requestCache (prefix 'edureach:api-cache:v1:') to free quota space.
const evictOldApiCache = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('edureach:api-cache:v1:')) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      evictOldApiCache();
      try {
        localStorage.setItem(key, value);
      } catch {
        // If still failing after eviction, skip caching silently.
      }
    }
  }
};

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post(API_ENDPOINTS.LOGIN, credentials);
    const { access, refresh } = response.data;

    if (access) {
      localStorage.setItem('access_token', access);
    }
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }

    return response.data;
  },

  async register(data: RegisterData) {
    const response = await apiClient.post(API_ENDPOINTS.REGISTER, data);
    const { access, refresh } = response.data;

    if (access) {
      localStorage.setItem('access_token', access);
    }
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }

    return response.data;
  },

  async logout() {
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem(CACHED_USER_KEY);
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get(API_ENDPOINTS.USER_ME);
    const user = response.data as User;
    safeSetItem(CACHED_USER_KEY, JSON.stringify(user));
    return user;
  },

  /** Build full URL for backend media (avatar, profile_cover). */
  getMediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const base = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  },

  async updateProfile(data: Partial<User> | FormData): Promise<User> {
    const config =
      data instanceof FormData
        ? { headers: { 'Content-Type': undefined } as unknown as Record<string, string> }
        : {};
    const response = await apiClient.patch(API_ENDPOINTS.USER_ME, data, config);
    const user = response.data as User;
    safeSetItem(CACHED_USER_KEY, JSON.stringify(user));
    return user;
  },

  async upgradeTier(tier: UserTier): Promise<User> {
    const response = await apiClient.post(API_ENDPOINTS.UPGRADE_TIER, { tier });
    const user = response.data as User;
    safeSetItem(CACHED_USER_KEY, JSON.stringify(user));
    return user;
  },

  async getLeaderboard(): Promise<LeaderboardData> {
    const response = await apiClient.get('users/leaderboard/');
    return response.data;
  },

  async getChallengeableUsers(): Promise<ChallengeableUser[]> {
    const response = await apiClient.get(API_ENDPOINTS.USERS_CHALLENGEABLE);
    return response.data;
  },

  async passwordReset(email: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.PASSWORD_RESET, { email });
  },

  async googleLogin(idToken: string): Promise<{ access: string; refresh: string; user: User }> {
    const response = await apiClient.post(API_ENDPOINTS.GOOGLE_LOGIN, { token: idToken });
    const { access, refresh } = response.data;
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(CACHED_USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  cacheUser(user: User): void {
    safeSetItem(CACHED_USER_KEY, JSON.stringify(user));
  },

  clearCachedUser(): void {
    localStorage.removeItem(CACHED_USER_KEY);
  },
};
