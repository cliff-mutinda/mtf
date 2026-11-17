import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Search, Plus, Upload, Eye, Edit2, Trash2, Smartphone, 
  RefreshCw, AlertCircle, Phone
} from 'lucide-react';
import contactService from '../services/contactService';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import ContactModal from '../components/ContactModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import SendMpesaModal from '../components/SendMpesaModal';
import CsvImportModal from '../components/CsvImportModal';

export function ContactsPage() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active contact modals
  const [editingContact, setEditingContact] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [mpesaContact, setMpesaContact] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 350);

  const fetchContacts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await contactService.getContacts({
        page,
        per_page: 20,
        search: debouncedSearch
      });

      if (res.success) {
        setContacts(res.data || []);
        setPagination(res.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
      } else {
        setError(res.message || 'Unable to fetch contacts.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to contacts service.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  const handleContactSaved = (savedContact) => {
    setSuccessMsg('Contact saved successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
    fetchContacts(pagination.page);
  };

  const handleContactDeleted = (deletedId) => {
    setSuccessMsg('Contact removed successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
    fetchContacts(pagination.page);
  };

  const handleImportCompleted = (summary) => {
    setSuccessMsg(`Import finished: ${summary.imported} new contacts added.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    fetchContacts(1);
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Contacts</h1>
          <p className="text-muted small mb-0">Manage your contacts and M-Pesa recipients.</p>
        </div>

        <div className="page-header-actions d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-biz-secondary d-inline-flex align-items-center gap-2"
            onClick={() => fetchContacts(pagination.page)}
            disabled={loading}
            title="Refresh contacts"
          >
            <RefreshCw size={14} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
          <button
            className="btn btn-sm btn-biz-secondary d-inline-flex align-items-center gap-2"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>
          <button
            className="btn btn-sm btn-biz-primary d-inline-flex align-items-center gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={14} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="alert alert-success py-2 px-3 small alert-dismissible fade show mb-3" role="alert">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => fetchContacts(pagination.page)}>
            Retry
          </button>
        </div>
      )}

      {/* Search Bar & Stats */}
      <div className="biz-card mb-4">
        <div className="p-3 border-bottom">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-12 col-sm-7 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-12 col-sm-auto text-muted small text-sm-end">
              <span>Total: <strong className="text-dark">{pagination.total}</strong> contact{pagination.total === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-container">
          <div className="table-responsive">
            <table className="table biz-table mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile Phone</th>
                  <th>Created</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      Loading contacts...
                    </td>
                  </tr>
                ) : contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>
                        <Link
                          to={`/contacts/${contact.id}`}
                          className="fw-semibold text-dark text-decoration-none hover-primary"
                        >
                          {contact.full_name}
                        </Link>
                      </td>
                      <td>
                        <span className="font-monospace text-dark">+{contact.phone_number}</span>
                      </td>
                      <td className="text-muted small">
                        {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 py-1 px-2"
                            title="Send M-Pesa STK Push"
                            onClick={() => setMpesaContact(contact)}
                          >
                            <Smartphone size={14} />
                            <span className="d-none d-lg-inline">Send M-Pesa</span>
                          </button>
                          <Link
                            to={`/contacts/${contact.id}`}
                            className="btn btn-sm btn-outline-secondary py-1 px-2"
                            title="View Contact Details"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-secondary py-1 px-2"
                            title="Edit Contact"
                            onClick={() => setEditingContact(contact)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            title="Delete Contact"
                            onClick={() => setDeletingContact(contact)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">
                      <EmptyState
                        icon={Users}
                        title={debouncedSearch ? 'No matching contacts found' : 'No contacts yet'}
                        description={
                          debouncedSearch
                            ? `No contacts matched "${debouncedSearch}". Try a different name or phone number.`
                            : 'Import your Google Contacts CSV or add your first contact manually.'
                        }
                        action={
                          !debouncedSearch && (
                            <div className="d-flex gap-2 justify-content-center">
                              <button
                                className="btn btn-sm btn-biz-secondary"
                                onClick={() => setIsImportModalOpen(true)}
                              >
                                Import CSV
                              </button>
                              <button
                                className="btn btn-sm btn-biz-primary"
                                onClick={() => setIsAddModalOpen(true)}
                              >
                                Add Contact
                              </button>
                            </div>
                          )
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
            <div className="text-center py-4 text-muted small">Loading contacts...</div>
          ) : contacts.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="card border p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={`/contacts/${contact.id}`}
                        className="fw-semibold text-dark text-decoration-none fs-6 d-block text-truncate"
                      >
                        {contact.full_name}
                      </Link>
                      <span className="font-monospace text-muted small d-flex align-items-center gap-1 mt-1 text-break-word">
                        <Phone size={12} className="flex-shrink-0" /> +{contact.phone_number}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between pt-2 border-top mt-2 gap-2">
                    <span className="text-muted small">
                      {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : ''}
                    </span>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      <button
                        className="btn btn-sm btn-mpesa px-2 py-1 flex-grow-1 flex-sm-grow-0 d-inline-flex align-items-center justify-content-center gap-1"
                        onClick={() => setMpesaContact(contact)}
                      >
                        <Smartphone size={14} />
                        <span>Pay</span>
                      </button>
                      <Link
                        to={`/contacts/${contact.id}`}
                        className="btn btn-sm btn-outline-secondary px-2 py-1 d-inline-flex align-items-center justify-content-center"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-secondary px-2 py-1 d-inline-flex align-items-center justify-content-center"
                        title="Edit Contact"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger px-2 py-1 d-inline-flex align-items-center justify-content-center"
                        title="Delete Contact"
                        onClick={() => setDeletingContact(contact)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={debouncedSearch ? 'No matching contacts found' : 'No contacts yet'}
              description={
                debouncedSearch
                  ? `No contacts matched "${debouncedSearch}".`
                  : 'Import your Google Contacts CSV or add your first contact manually.'
              }
            />
          )}
        </div>

        {/* Pagination */}
        <div className="px-3 pb-3">
          <Pagination
            pagination={pagination}
            onPageChange={(p) => fetchContacts(p)}
          />
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ContactModal
        isOpen={isAddModalOpen || Boolean(editingContact)}
        contact={editingContact}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingContact(null);
        }}
        onSaved={handleContactSaved}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingContact)}
        contact={deletingContact}
        onClose={() => setDeletingContact(null)}
        onDeleted={handleContactDeleted}
      />

      {/* Send M-Pesa Modal */}
      <SendMpesaModal
        isOpen={Boolean(mpesaContact)}
        contact={mpesaContact}
        onClose={() => setMpesaContact(null)}
        onCompleted={() => {
          fetchContacts(pagination.page);
        }}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={handleImportCompleted}
      />
    </div>
  );
}

export default ContactsPage;
