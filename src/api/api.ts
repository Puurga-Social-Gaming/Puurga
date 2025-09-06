import axios from 'axios';

const getToken = () => {
  const user = localStorage.getItem('user');
  if (user) {
    const userData = JSON.parse(user);
    return userData?.token || null;
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
