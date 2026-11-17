import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, CreditCard, LayoutDashboard, Menu, X, Smartphone, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close mobile drawer if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // If user is not authenticated, do not show navigation bar
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav ref={navRef} className="biz-navbar sticky-top">
      <div className="app-container px-3 px-md-4 py-2">
        <div className="d-flex align-items-center justify-content-between">
          {/* Brand Logo & Name */}
          <NavLink to="/" className="text-decoration-none d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded d-flex align-items-center justify-content-center flex-shrink-0">
              <Smartphone size={20} className="text-primary" />
            </div>
            <div className="text-truncate">
              <span className="fw-bold text-dark fs-6 d-block lh-1 text-truncate">ContactPay</span>
              <span className="text-muted small text-truncate d-block" style={{ fontSize: '0.725rem' }}>Contacts &amp; M-Pesa STK</span>
            </div>
          </NavLink>

          {/* Desktop Nav Links & User Profile */}
          <div className="d-none d-md-flex align-items-center gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `biz-nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/contacts"
              className={({ isActive }) => `biz-nav-link ${isActive ? 'active' : ''}`}
            >
              <Users size={16} />
              <span>Contacts</span>
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) => `biz-nav-link ${isActive ? 'active' : ''}`}
            >
              <CreditCard size={16} />
              <span>M-Pesa Transactions</span>
            </NavLink>

            {/* User Badge & Logout Button */}
            <div className="d-flex align-items-center gap-2 border-start ps-3 ms-1">
              <div
                className="badge bg-light text-dark border px-2 py-1 d-inline-flex align-items-center gap-1 fw-normal"
                style={{ fontSize: '0.8125rem' }}
                title={`Logged in as ${user?.username}`}
              >
                <User size={13} className="text-primary" />
                <span className="fw-medium">{user?.username || 'User'}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 py-1 px-2"
                title="Logout from ContactPay"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="btn btn-sm btn-outline-secondary d-md-none border-0 p-2 d-flex align-items-center justify-content-center"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
            style={{ width: '40px', height: '40px' }}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav Collapse */}
        {isOpen && (
          <div className="d-md-none pt-3 pb-2 border-top mt-2">
            {/* User profile bar in mobile */}
            <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded border mb-2">
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <div className="bg-primary bg-opacity-10 text-primary p-1 rounded-circle">
                  <User size={16} />
                </div>
                <div className="text-truncate">
                  <span className="fw-semibold text-dark small d-block text-truncate">{user?.username || 'User'}</span>
                  <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>Authenticated</span>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 py-1 px-2"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>

            <div className="d-flex flex-column gap-1">
              <NavLink
                to="/"
                end
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `biz-nav-link w-100 ${isActive ? 'active' : ''}`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/contacts"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `biz-nav-link w-100 ${isActive ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>Contacts</span>
              </NavLink>
              <NavLink
                to="/transactions"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `biz-nav-link w-100 ${isActive ? 'active' : ''}`}
              >
                <CreditCard size={18} />
                <span>M-Pesa Transactions</span>
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
