import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('contactpay_auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('contactpay_auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Verify authentication on initial application load
  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('contactpay_auth_token');
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await authService.getMe();
        if (isMounted && res.success && res.user) {
          setUser(res.user);
          setToken(storedToken);
          localStorage.setItem('contactpay_auth_user', JSON.stringify(res.user));
        } else if (isMounted) {
          throw new Error('Verification failed');
        }
      } catch (err) {
        if (isMounted) {
          localStorage.removeItem('contactpay_auth_token');
          localStorage.removeItem('contactpay_auth_user');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username, password) => {
    const res = await authService.login(username, password);
    if (res.success && res.token) {
      localStorage.setItem('contactpay_auth_token', res.token);
      if (res.user) {
        localStorage.setItem('contactpay_auth_user', JSON.stringify(res.user));
        setUser(res.user);
      }
      setToken(res.token);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('contactpay_auth_token');
      localStorage.removeItem('contactpay_auth_user');
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
