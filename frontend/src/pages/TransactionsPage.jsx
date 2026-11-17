import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Search, RefreshCw, AlertCircle, Smartphone, CheckCircle2, Clock, XCircle, Phone } from 'lucide-react';
import mpesaService from '../services/mpesaService';
import useDebounce from '../hooks/useDebounce';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 350);

  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await mpesaService.getTransactions({
        page,
        per_page: 20,
        status: statusFilter,
        search: debouncedSearch
      });

      if (res.success) {
        setTransactions(res.data || []);
        setPagination(res.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
      } else {
        setError(res.message || 'Unable to fetch transactions.');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with backend.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const handleRefreshRow = async (checkoutId) => {
    try {
      const res = await mpesaService.getTransactionStatus(checkoutId);
      if (res.success && res.data) {
        setTransactions((prev) =>
          prev.map((t) => (t.checkout_request_id === checkoutId ? { ...t, ...res.data } : t))
        );
      }
    } catch (e) {
      // ignore
    }
  };

  const filterTabs = ['All', 'Successful', 'Pending', 'Failed', 'Cancelled'];

  return (
    <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">M-Pesa Transactions</h1>
          <p className="text-muted small mb-0">Track STK Push requests, receipts, and payment status outcomes.</p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-sm btn-biz-secondary d-inline-flex align-items-center gap-2"
            onClick={() => fetchTransactions(pagination.page)}
            disabled={loading}
            title="Refresh transactions"
          >
            <RefreshCw size={14} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => fetchTransactions(pagination.page)}>
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="biz-card mb-4">
        <div className="p-3 border-bottom">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3">
            {/* Responsive Filter Tabs */}
            <div className="filter-tabs-container">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`btn btn-sm ${statusFilter === tab ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ maxWidth: '380px', width: '100%' }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search recipient, phone, receipt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
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
                  <th>Receipt Number</th>
                  <th>Checkout Request ID</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        {tx.contact_id ? (
                          <Link
                            to={`/contacts/${tx.contact_id}`}
                            className="fw-semibold text-dark text-decoration-none"
                          >
                            {tx.recipient_name}
                          </Link>
                        ) : (
                          <span className="text-dark fw-medium">{tx.recipient_name || '—'}</span>
                        )}
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
                      <td className="font-monospace small">
                        {tx.receipt_number ? (
                          <span className="text-success fw-bold">{tx.receipt_number}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="mono-break text-muted small" style={{ fontSize: '0.75rem' }}>
                        {tx.checkout_request_id}
                      </td>
                      <td className="text-end">
                        {tx.status === 'Pending' && (
                          <button
                            className="btn btn-sm btn-outline-secondary py-0 px-2 small"
                            title="Check live status from Daraja"
                            onClick={() => handleRefreshRow(tx.checkout_request_id)}
                          >
                            Check
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">
                      <EmptyState
                        icon={CreditCard}
                        title="No transactions found"
                        description={
                          searchTerm || statusFilter !== 'All'
                            ? 'No transactions matched your current filters.'
                            : 'No M-Pesa transactions have been initiated yet.'
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
            <div className="text-center py-4 text-muted small">Loading transactions...</div>
          ) : transactions.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="card border p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div style={{ minWidth: 0 }}>
                      {tx.contact_id ? (
                        <Link
                          to={`/contacts/${tx.contact_id}`}
                          className="fw-semibold text-dark text-decoration-none d-block text-truncate"
                        >
                          {tx.recipient_name}
                        </Link>
                      ) : (
                        <span className="fw-semibold text-dark d-block text-truncate">{tx.recipient_name}</span>
                      )}
                      <span className="font-monospace text-muted small d-flex align-items-center gap-1 mt-1 text-break-word">
                        <Phone size={12} className="flex-shrink-0" /> +{tx.phone_number}
                      </span>
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>

                  <div className="d-flex justify-content-between align-items-center my-2 p-2 bg-light rounded">
                    <span className="text-muted small">Amount</span>
                    <strong className="text-dark fs-6">KSh {Number(tx.amount).toLocaleString()}</strong>
                  </div>

                  {tx.receipt_number && (
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Receipt:</span>
                      <span className="font-monospace fw-bold text-success">{tx.receipt_number}</span>
                    </div>
                  )}

                  {tx.checkout_request_id && (
                    <div className="text-muted small my-1">
                      <span className="d-block text-muted" style={{ fontSize: '0.7rem' }}>Checkout ID:</span>
                      <span className="mono-break small text-muted d-block" style={{ fontSize: '0.75rem' }}>
                        {tx.checkout_request_id}
                      </span>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top mt-2">
                    <span>{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</span>
                    {tx.status === 'Pending' && (
                      <button
                        className="btn btn-sm btn-outline-secondary py-1 px-3"
                        onClick={() => handleRefreshRow(tx.checkout_request_id)}
                      >
                        Check
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No transactions found"
              description="No M-Pesa transactions matched the selected filters."
            />
          )}
        </div>

        {/* Pagination */}
        <div className="px-3 pb-3">
          <Pagination
            pagination={pagination}
            onPageChange={(p) => fetchTransactions(p)}
          />
        </div>
      </div>
    </div>
  );
}

export default TransactionsPage;
