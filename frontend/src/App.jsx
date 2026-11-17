import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import ContactDetailPage from './pages/ContactDetailPage';
import TransactionsPage from './pages/TransactionsPage';

export function App() {
  return (
    <AuthProvider>
      <div className="d-flex flex-column min-vh-100 w-100" style={{ backgroundColor: '#f8fafc' }}>
        <Navbar />

        <main className="flex-grow-1 w-100 app-container">
          <Routes>
            {/* Public authentication route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected application routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <ContactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts/:id"
              element={
                <ProtectedRoute>
                  <ContactDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="py-3 px-3 px-md-4 border-top bg-white mt-auto text-muted small">
          <div className="app-container d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 text-center text-sm-start">
            <span>ContactPay &bull; Contact Management &amp; Safaricom Daraja M-Pesa STK Integration</span>
            <span className="text-secondary">Environment: Production Ready</span>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
