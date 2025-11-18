import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_CALL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to check network status
api.interceptors.request.use(
  (config) => {
    // Check if navigator.onLine is available and false
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('You are offline. Please check your internet connection.', {
        position: "bottom-right",
        autoClose: 3000,
        theme: "dark",
      });
      // Return a rejected promise to cancel the request
      return Promise.reject(new Error('No internet connection'));
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (optional, for handling network errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response && error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.', {
        position: "bottom-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
    return Promise.reject(error);
  }
);

export default api;