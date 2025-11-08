import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

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
  created_at: string;
}

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
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get(API_ENDPOINTS.USER_ME);
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put(API_ENDPOINTS.USER_ME, data);
    return response.data;
  },

  async upgradeTier(tier: UserTier): Promise<User> {
    const response = await apiClient.post(API_ENDPOINTS.UPGRADE_TIER, { tier });
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};
