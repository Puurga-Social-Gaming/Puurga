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
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
