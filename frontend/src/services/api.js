import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Lazy import to avoid circular dependency
  try {
    const stored = JSON.parse(localStorage.getItem('interview-ai-auth') || '{}');
    const token = stored?.state?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('interview-ai-auth');
      window.location.href = '/signin';
    }
    return Promise.reject(err);
  }
);

export default api;

