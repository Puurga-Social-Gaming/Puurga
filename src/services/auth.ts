import api from './api';
import type { User } from '../types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', userData);
    localStorage.setItem('token', data.token);
    return data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};