import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import contactService from '../services/contactService';

export function DeleteConfirmModal({ isOpen, onClose, contact, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !contact) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await contactService.deleteContact(contact.id);
      if (res.success) {
        onDeleted(contact.id);
        onClose();
      } else {
        setError(res.message || 'Failed to delete contact.');
      }
    } catch (err) {
      setError(err.message || 'Could not delete contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content biz-modal-content">
          <div className="modal-header border-bottom px-3 px-md-4 py-3 align-items-center">
            <h5 className="modal-title fs-6 fw-semibold text-danger d-flex align-items-center gap-2 mb-0">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>Delete Contact</span>
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <div className="modal-body px-3 px-md-4 py-3">
            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3 text-break-word">
                {error}
              </div>
            )}
            <p className="text-dark mb-2 text-break-word">
              Are you sure you want to delete <strong className="text-dark">{contact.full_name || 'this contact'}</strong>?
            </p>
            <p className="text-muted small mb-0 text-break-word">
              Phone: <span className="font-monospace text-dark">+{contact.phone_number}</span>. This will also remove associated local transaction history for this contact.
            </p>
          </div>

          <div className="modal-footer border-top px-3 px-md-4 py-2 bg-light d-flex justify-content-end gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-biz-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger d-inline-flex align-items-center gap-2"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? <Loader2 size={15} className="spinner-border spinner-border-sm" /> : <Trash2 size={15} />}
              <span>Delete Contact</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
