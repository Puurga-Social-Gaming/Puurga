import axios from 'axios';

interface EnhancedError extends Error {
  response?: any;
  status?: number;
  data?: any;
}

// ─── Module-level token cache ────────────────────────────────────────────────
let _cachedToken: string | null = localStorage.getItem('token');

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

// ─── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Refresh from localStorage in case another module wrote it
    const stored = localStorage.getItem('token');
    if (stored && stored !== _cachedToken) _cachedToken = stored;

    if (_cachedToken) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status as number | undefined;
    const authHeader = error.config?.headers?.Authorization || error.config?.headers?.authorization;
    const tokenWasSent = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
    const isTransient =
      !error.response ||
      status === 502 ||
      status === 503 ||
      status === 504;

    const isExpectedBusiness =
      status === 403 &&
      /credits|not allowed|forbidden|blocked|privacy/i.test(
        String(error.response?.data?.error || error.response?.data?.message || '')
      );

    if (isTransient || isExpectedBusiness) {
      if (import.meta.env.DEV) {
        console.warn(isExpectedBusiness ? 'ℹ️ Expected API response:' : '⏳ Transient API issue:', {
          url: error.config?.url,
          status: status ?? 'network',
          message: error.response?.data?.error || error.response?.data?.message || error.message,
        });
      }
    } else {
      console.error('❌ Response error:', {
        message: error.message,
        status,
        data: error.response?.data,
      });
    }

    if (!error.response) {
      return Promise.reject(new Error('Network error - Please check if the server is running'));
    }

    // ── 401 handler ────────────────────────────────────────────────────────────
    if (error.response?.status === 401 && !error.config?._retry && tokenWasSent) {
      error.config._retry = true;

      // Token might be expired — clear and redirect to login
      console.log('🔒 Server 401 — clearing session and redirecting to login');
      _cachedToken = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }

    // ── Enhance and forward all other errors ──────────────────────────────────
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
