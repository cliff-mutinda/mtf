/**
 * Authentication API service.
 */
import apiClient from '../config/api';

export const authService = {
  /**
   * Authenticate user with username and password.
   */
  async login(username, password) {
    const response = await apiClient.post('/api/auth/login', { username, password });
    return response.data;
  },

  /**
   * Register a new user account.
   */
  async register(username, password) {
    const response = await apiClient.post('/api/auth/register', { username, password });
    return response.data;
  },

  /**
   * Log out currently authenticated session.
   */
  async logout() {
    try {
      const response = await apiClient.post('/api/auth/logout');
      return response.data;
    } catch {
      // Best-effort logout
      return { success: true };
    }
  },

  /**
   * Fetch current authenticated user's profile.
   */
  async getMe() {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  }
};

export default authService;
