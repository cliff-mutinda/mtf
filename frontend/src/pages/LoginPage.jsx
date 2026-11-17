import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Smartphone, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Destination after login
  const from = location.state?.from?.pathname || '/';

  // If already authenticated and not loading, redirect to target page
  if (!authLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await login(trimmedUser, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.message || 'Invalid username or password.');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('connect') || msg.toLowerCase().includes('network')) {
        setError('Unable to connect to the server. Please try again.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center px-3 py-4" style={{ backgroundColor: '#f8fafc' }}>
      <div className="w-100" style={{ maxWidth: '420px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-2">
            <Smartphone size={32} className="text-primary" />
          </div>
          <h1 className="h4 fw-bold text-dark mb-1">ContactPay</h1>
          <p className="text-muted small mb-0">Contact Management &amp; Safaricom Daraja M-Pesa</p>
        </div>

        {/* Login Card */}
        <div className="biz-card p-4">
          <div className="mb-4">
            <h2 className="fs-5 fw-bold text-dark mb-1">Welcome back</h2>
            <p className="text-muted small mb-0">Please sign in to access your account.</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 small d-flex align-items-start gap-2 mb-3" role="alert">
              <AlertCircle size={16} className="mt-1 flex-shrink-0" />
              <div className="text-break-word">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Username Input */}
            <div className="mb-3">
              <label htmlFor="username-input" className="form-label small fw-medium mb-1">
                Username
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted">
                  <User size={16} />
                </span>
                <input
                  id="username-input"
                  type="text"
                  name="username"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="Enter your username"
                  className="form-control"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label htmlFor="password-input" className="form-label small fw-medium mb-1">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted">
                  <Lock size={16} />
                </span>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="form-control"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-biz-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="spinner-border spinner-border-sm" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4 text-muted small">
          <span>Protected by secure token authentication &bull; ContactPay</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
