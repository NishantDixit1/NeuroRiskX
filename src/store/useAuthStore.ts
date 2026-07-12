import axios from 'axios';
import { create } from 'zustand';
import { User } from '../types';
import { authService, tokenStore } from '../services/api';

interface AuthStore {
  user: User | null;
  /** null while we are still checking a stored token on first load. */
  isReady: boolean;
  isLoading: boolean;
  error: string | null;

  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
  clearError: () => void;
}

function readableAuthError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Could not reach the server. Please try again in a moment.';
    }
    const status = error.response?.status;
    if (status === 409) return 'An account with that email already exists. Try signing in.';
    if (status === 401) return 'Incorrect email or password.';
    if (status === 422) {
      return 'Please enter a valid email and a password of at least 8 characters.';
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isReady: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { accessToken, user } = await authService.signup(email, password);
      tokenStore.set(accessToken);
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: readableAuthError(error, 'Could not create your account.'), isLoading: false });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { accessToken, user } = await authService.login(email, password);
      tokenStore.set(accessToken);
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: readableAuthError(error, 'Could not sign you in.'), isLoading: false });
      throw error;
    }
  },

  logout: () => {
    tokenStore.clear();
    set({ user: null, error: null });
  },

  /** On first load, exchange any stored token for the current user. */
  restore: async () => {
    if (!tokenStore.get()) {
      set({ isReady: true });
      return;
    }
    try {
      set({ user: await authService.me(), isReady: true });
    } catch {
      // Expired or invalid token. Drop it silently and show the logged-out app.
      tokenStore.clear();
      set({ user: null, isReady: true });
    }
  },
}));
