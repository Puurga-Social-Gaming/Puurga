import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async (email, password) => {
    const { user } = await authService.login({ email, password });
    set({ user, isAuthenticated: true });
  },
  register: async (name, email, password) => {
    const { user } = await authService.register({ name, email, password });
    set({ user, isAuthenticated: true });
  },
  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },
  loadUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));