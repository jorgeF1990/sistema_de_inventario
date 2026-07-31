import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Avoid "Mixed Content" browser errors: if the app is served over HTTPS,
// never let the API base URL silently downgrade the request to HTTP.
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http://')) {
  API_URL = API_URL.replace('http://', 'https://');
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    const isAuthEndpoint = config.url?.includes('/auth/login') || 
                           config.url?.includes('/auth/registro') ||
                           config.url?.includes('/auth/forgot-password') ||
                           config.url?.includes('/auth/reset-password') ||
                           config.url?.includes('/auth/verify');
    
    if (!isAuthEndpoint && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;