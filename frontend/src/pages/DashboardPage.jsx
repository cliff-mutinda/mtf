import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, CheckCircle2, Clock, ArrowRight, Smartphone, RefreshCw, AlertCircle, Plus, Upload, Phone, Receipt } from 'lucide-react';
import mpesaService from '../services/mpesaService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ContactModal from '../components/ContactModal';
import CsvImportModal from '../components/CsvImportModal';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await mpesaService.getDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setError(res.message || 'Unable to load dashboard data.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Dashboard</h1>
          <p className="text-muted small mb-0">Overview of your contacts and M-Pesa STK push activity.</p>
        </div>

        <div className="page-header-actions d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-biz-secondary d-inline-flex align-items-center gap-2"
            onClick={fetchStats}
            disabled={loading}
            title="Refresh dashboard stats"
          >
            <RefreshCw size={14} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
          <button
            className="btn btn-sm btn-biz-secondary d-inline-flex align-items-center gap-2"
            onClick={() => setShowCsvImport(true)}
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>
          <button
            className="btn btn-sm btn-biz-primary d-inline-flex align-items-center gap-2"
            onClick={() => setShowAddContact(true)}
          >
            <Plus size={14} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button className="btn btn-sm btn-outline-danger py-0 px-2" onClick={fetchStats}>
            Retry
          </button>
        </div>
      )}

      {/* Metrics Row: 1 col on mobile (<576px), 2 cols on tablet (576-991px), 4 cols on desktop (>=992px) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="biz-card h-100 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-medium">Total Contacts</span>
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded">
                <Users size={18} />
              </div>
            </div>
            <div className="fs-3 fw-bold text-dark">
              {loading ? '—' : stats?.total_contacts ?? 0}
            </div>
            <Link to="/contacts" className="text-primary text-decoration-none small d-inline-flex align-items-center gap-1 mt-2">
              Manage contacts <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="biz-card h-100 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-medium">M-Pesa Requests</span>
              <div className="p-2 bg-info bg-opacity-10 text-info rounded">
                <Smartphone size={18} />
              </div>
            </div>
            <div className="fs-3 fw-bold text-dark">
              {loading ? '—' : stats?.total_transactions ?? 0}
            </div>
            <Link to="/transactions" className="text-primary text-decoration-none small d-inline-flex align-items-center gap-1 mt-2">
              View all requests <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="biz-card h-100 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-medium">Successful Payments</span>
              <div className="p-2 bg-success bg-opacity-10 text-success rounded">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="fs-3 fw-bold text-success">
              {loading ? '—' : stats?.successful_payments ?? 0}
            </div>
            <span className="text-muted small mt-2 d-block text-truncate">
              Total: KSh {Number(stats?.total_amount_collected || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="biz-card h-100 p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-medium">Pending Payments</span>
              <div className="p-2 bg-warning bg-opacity-10 text-warning rounded">
                <Clock size={18} />
              </div>
            </div>
            <div className="fs-3 fw-bold text-warning">
              {loading ? '—' : stats?.pending_payments ?? 0}
            </div>
            <span className="text-muted small mt-2 d-block text-truncate">Awaiting customer PIN</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="biz-card">
        <div className="biz-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="text-dark">Recent M-Pesa Activity</span>
          <Link to="/transactions" className="btn btn-sm btn-link text-decoration-none p-0 small">
            View All Transactions &rarr;
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-container">
          <div className="table-responsive">
            <table className="table biz-table mb-0">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Phone Number</th>
                  <th>Amount (KSh)</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      Loading recent activity...
                    </td>
                  </tr>
                ) : stats?.recent_activity && stats.recent_activity.length > 0 ? (
                  stats.recent_activity.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="fw-medium text-dark">{tx.recipient_name}</span>
                      </td>
                      <td className="font-monospace text-muted">+{tx.phone_number}</td>
                      <td className="fw-semibold text-dark">
                        KSh {Number(tx.amount).toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="text-muted small">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="font-monospace small text-dark">
                        {tx.receipt_number || <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <EmptyState
                        icon={CreditCard}
                        title="No M-Pesa activity yet"
                        description="Initiate an STK Push to any contact to begin tracking payment prompts."
                        action={
                          <Link to="/contacts" className="btn btn-sm btn-biz-primary">
                            Go to Contacts
                          </Link>
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-container p-3">
          {loading ? (
            <div className="text-center py-4 text-muted small">Loading recent activity...</div>
          ) : stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {stats.recent_activity.map((tx) => (
                <div key={tx.id} className="card border p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div style={{ minWidth: 0 }}>
                      <span className="fw-semibold text-dark d-block text-truncate">{tx.recipient_name}</span>
                      <span className="font-monospace text-muted small d-flex align-items-center gap-1 mt-1">
                        <Phone size={12} /> +{tx.phone_number}
                      </span>
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>

                  <div className="d-flex justify-content-between align-items-center my-2 p-2 bg-light rounded">
                    <span className="text-muted small">Amount</span>
                    <strong className="text-dark">KSh {Number(tx.amount).toLocaleString()}</strong>
                  </div>

                  <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top mt-1">
                    <span>{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}</span>
                    {tx.receipt_number && (
                      <span className="font-monospace text-success fw-bold d-flex align-items-center gap-1">
                        <Receipt size={12} /> {tx.receipt_number}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No M-Pesa activity yet"
              description="Initiate an STK Push to any contact to begin tracking payment prompts."
              action={
                <Link to="/contacts" className="btn btn-sm btn-biz-primary">
                  Go to Contacts
                </Link>
              }
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSaved={() => {
          fetchStats();
        }}
      />

      <CsvImportModal
        isOpen={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        onImportCompleted={() => {
          fetchStats();
        }}
      />
    </div>
  );
}

export default DashboardPage;
