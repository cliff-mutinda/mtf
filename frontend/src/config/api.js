/**
 * Centralized API client configuration.
 * All HTTP requests in the frontend MUST import and use this apiClient.
 * The backend base URL is read exclusively from import.meta.env.VITE_API_BASE_URL.
 */
import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000 // 30s timeout
});

// Request interceptor: attach Bearer authentication token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('contactpay_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction and auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Unable to connect to the server. Please try again.';

    if (error.response) {
      const status = error.response.status;
      const resData = error.response.data;

      // Check if session has expired or unauthorized on protected resource
      if (status === 401) {
        const reqUrl = error.config?.url || '';
        const isLoginAttempt = reqUrl.includes('/auth/login');
        if (!isLoginAttempt) {
          localStorage.removeItem('contactpay_auth_token');
          localStorage.removeItem('contactpay_auth_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      if (resData && resData.message) {
        message = resData.message;
        if (resData.errors) {
          const fieldErrors = Object.entries(resData.errors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          message = `${message} (${fieldErrors})`;
        }
      } else if (status === 404) {
        message = 'Requested resource not found.';
      } else if (status === 500) {
        message = 'Unable to connect to the server. Please try again.';
      } else {
        message = `Server returned error (${status}).`;
      }
    } else if (error.request) {
      message = 'Unable to connect to the server. Please try again.';
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
