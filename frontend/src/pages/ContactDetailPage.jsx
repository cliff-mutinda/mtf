import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Smartphone, Edit2, Trash2, CreditCard, Calendar, Phone, AlertCircle, RefreshCw, Receipt } from 'lucide-react';
import contactService from '../services/contactService';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ContactModal from '../components/ContactModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import SendMpesaModal from '../components/SendMpesaModal';

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingMpesa, setIsSendingMpesa] = useState(false);

  const fetchContact = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await contactService.getContactById(id);
      if (res.success && res.data) {
        setContact(res.data);
      } else {
        setError(res.message || 'Contact not found.');
      }
    } catch (err) {
      setError(err.message || 'Could not load contact details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchContact();
  }, [id]);

  if (loading) {
    return (
      <div className="container-fluid px-3 px-md-4 py-5 text-center text-muted">
        Loading contact details...
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container-fluid px-3 px-md-4 py-4">
        <div className="alert alert-danger py-3 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error || 'Contact not found.'}</span>
          </div>
          <Link to="/contacts" className="btn btn-sm btn-outline-danger">
            Back to Contacts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
      {/* Top Breadcrumb / Back button */}
      <div className="mb-3">
        <Link to="/contacts" className="btn btn-sm btn-link text-decoration-none p-0 d-inline-flex align-items-center gap-1 text-muted">
          <ArrowLeft size={16} />
          <span>Back to Contacts</span>
        </Link>
      </div>

      {/* Main Info Card */}
      <div className="biz-card mb-4">
        <div className="biz-card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
            <div style={{ minWidth: 0 }}>
              <h2 className="h4 fw-bold text-dark mb-1 text-break-word">{contact.full_name}</h2>
              <span className="text-muted small">
                Added on {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}
              </span>
            </div>

            <div className="page-header-actions d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-mpesa d-inline-flex align-items-center gap-2"
                onClick={() => setIsSendingMpesa(true)}
              >
                <Smartphone size={15} />
                <span>Send M-Pesa</span>
              </button>
              <button
                className="btn btn-sm btn-biz-secondary d-inline-flex align-items-center gap-2"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={15} />
                <span>Edit</span>
              </button>
              <button
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-2"
                onClick={() => setIsDeleting(true)}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div className="row g-3 p-3 bg-light rounded border">
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block">First Name</span>
              <strong className="text-dark text-break-word">{contact.first_name || '—'}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block">Middle Name</span>
              <strong className="text-dark text-break-word">{contact.middle_name || '—'}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block">Last Name</span>
              <strong className="text-dark text-break-word">{contact.last_name || '—'}</strong>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <span className="text-muted small d-block">Normalized Phone</span>
              <strong className="font-monospace text-dark text-break-word">+{contact.phone_number}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="biz-card">
        <div className="biz-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="text-dark d-flex align-items-center gap-2">
            <CreditCard size={18} className="text-primary flex-shrink-0" />
            Payment History
          </span>
          <button
            className="btn btn-sm btn-link text-decoration-none p-0 small"
            onClick={fetchContact}
          >
            <RefreshCw size={14} className="me-1" />
            Refresh
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-container">
          <div className="table-responsive">
            <table className="table biz-table mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount (KSh)</th>
                  <th>Status</th>
                  <th>M-Pesa Receipt</th>
                  <th>Checkout Request ID</th>
                </tr>
              </thead>
              <tbody>
                {contact.transactions && contact.transactions.length > 0 ? (
                  contact.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-muted small">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="fw-semibold text-dark">
                        KSh {Number(tx.amount).toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="font-monospace small">
                        {tx.receipt_number ? (
                          <span className="text-success fw-bold">{tx.receipt_number}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="mono-break text-muted small" style={{ fontSize: '0.75rem' }}>
                        {tx.checkout_request_id || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <EmptyState
                        icon={CreditCard}
                        title="No payment history yet"
                        description={`No M-Pesa STK push prompts have been recorded for ${contact.full_name}.`}
                        action={
                          <button
                            className="btn btn-sm btn-mpesa"
                            onClick={() => setIsSendingMpesa(true)}
                          >
                            Send First Payment Prompt
                          </button>
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
          {contact.transactions && contact.transactions.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {contact.transactions.map((tx) => (
                <div key={tx.id} className="card border p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small">{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</span>
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
                    <div className="text-muted small pt-2 border-top mt-1">
                      <span className="d-block mb-1" style={{ fontSize: '0.7rem' }}>Checkout ID:</span>
                      <span className="mono-break small d-block" style={{ fontSize: '0.75rem' }}>
                        {tx.checkout_request_id}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No payment history yet"
              description={`No M-Pesa STK push prompts have been recorded for ${contact.full_name}.`}
              action={
                <button
                  className="btn btn-sm btn-mpesa"
                  onClick={() => setIsSendingMpesa(true)}
                >
                  Send First Payment Prompt
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ContactModal
        isOpen={isEditing}
        contact={contact}
        onClose={() => setIsEditing(false)}
        onSaved={(updated) => {
          setContact((prev) => ({ ...prev, ...updated }));
        }}
      />

      <DeleteConfirmModal
        isOpen={isDeleting}
        contact={contact}
        onClose={() => setIsDeleting(false)}
        onDeleted={() => {
          navigate('/contacts');
        }}
      />

      <SendMpesaModal
        isOpen={isSendingMpesa}
        contact={contact}
        onClose={() => setIsSendingMpesa(false)}
        onCompleted={() => {
          fetchContact();
        }}
      />
    </div>
  );
}

export default ContactDetailPage;
