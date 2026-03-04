import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    learningGoal?: string;
    learnerType?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const cachedUser = authService.getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          // Keep a cached session for offline/static frontend mode.
          if (!cachedUser) {
            authService.clearCachedUser();
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('network:offline'));
          }
        }
      } else if (!navigator.onLine && cachedUser) {
        // Allow previously-cached users to continue in offline mode.
        setUser(cachedUser);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await authService.login({ username, password });
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      const cachedUser = authService.getCachedUser();
      if (!navigator.onLine && cachedUser && cachedUser.username === username) {
        setUser(cachedUser);
        return;
      }
      throw error;
    }
  };

  const register: AuthContextType['register'] = async (payload) => {
    const { username, email, password, firstName, lastName, learningGoal, learnerType } = payload;
    await authService.register({
      username,
      email,
      password1: password,
      password2: password,
      first_name: firstName,
      last_name: lastName,
      learning_goal: learningGoal,
      learner_type: learnerType,
    });
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      const cachedUser = authService.getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        return;
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
