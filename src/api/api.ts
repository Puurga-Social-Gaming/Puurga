import axios from 'axios';

const getToken = () => {
  // Preferred: Supabase/Backend token stored directly
  const direct = localStorage.getItem('token');
  if (direct && typeof direct === 'string') return direct;

  // Legacy: some flows store a user object with token
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      return userData?.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('API Request with token:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        tokenPreview: token.substring(0, 20) + '...'
      });
    } else {
      console.warn('API Request WITHOUT token:', {
        url: config.url,
        method: config.method
      });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('401 Unauthorized - Token may be invalid or expired');
      console.log('Current token in localStorage:', localStorage.getItem('token')?.substring(0, 20) + '...');
      console.log('Current user in localStorage:', localStorage.getItem('user'));
    }
    return Promise.reject(error);
  }
);

export default api;
