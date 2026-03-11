import axios from 'axios';
import { toast } from 'react-hot-toast';

interface EnhancedError extends Error {
  response?: any;
  status?: number;
  data?: any;
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 second timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Making request:', {
      method: config.method,
      url: config.url,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? '***present***' : '***not-present***'
      }
    });

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Handle network errors
    if (!error.response) {
      toast.error('Network error - Please check if the server is running');
      return Promise.reject(new Error('Network error - Please check if the server is running'));
    }

    // Handle 401 Unauthorized - Clean up and redirect to login
    if (error.response.status === 401) {
      console.log('🔒 401 Unauthorized - Clearing session and redirecting to login');
      // Only clear if we actually have a token to prevent loops if login itself failed
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('supabase.auth.token');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
    }

    // Enhance error object with more details
    const enhancedError: EnhancedError = new Error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'
    );

    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;

    return Promise.reject(enhancedError);
  }
);

export default api;