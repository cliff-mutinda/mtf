import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Loader2, AlertCircle } from 'lucide-react';
import contactService from '../services/contactService';

export function ContactModal({ isOpen, onClose, contact, onSaved }) {
  const isEditing = Boolean(contact && contact.id);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        middle_name: contact.middle_name || '',
        last_name: contact.last_name || '',
        phone_number: contact.phone_number || ''
      });
    } else {
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        phone_number: ''
      });
    }
    setError('');
  }, [contact, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic frontend checks
    if (!formData.first_name.trim()) {
      setError('First name is required.');
      return;
    }
    if (!formData.phone_number.trim()) {
      setError('Mobile phone number is required.');
      return;
    }

    try {
      setLoading(true);
      let response;
      if (isEditing) {
        response = await contactService.updateContact(contact.id, formData);
      } else {
        response = await contactService.createContact(formData);
      }

      if (response.success) {
        onSaved(response.data);
        onClose();
      } else {
        setError(response.message || 'Operation failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving the contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content biz-modal-content">
          <div className="modal-header border-bottom px-3 px-md-4 py-3 align-items-center">
            <h5 className="modal-title fs-6 fw-semibold d-flex align-items-center gap-2 mb-0">
              {isEditing ? <Save size={18} className="text-primary flex-shrink-0" /> : <UserPlus size={18} className="text-primary flex-shrink-0" />}
              <span>{isEditing ? 'Edit Contact' : 'Add New Contact'}</span>
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ minHeight: 0 }}>
            <div className="modal-body px-3 px-md-4 py-3">
              {error && (
                <div className="alert alert-danger py-2 px-3 small d-flex align-items-start gap-2 mb-3">
                  <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                  <div className="text-break-word">{error}</div>
                </div>
              )}

              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-medium mb-1">
                    First Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    maxLength={100}
                    placeholder="e.g. John"
                    className="form-control"
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-medium mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    maxLength={100}
                    placeholder="e.g. Kamau"
                    className="form-control"
                    value={formData.middle_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    maxLength={100}
                    placeholder="e.g. Mwangi"
                    className="form-control"
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-medium mb-1">
                    Mobile Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    required
                    placeholder="e.g. 0712345678 or +254712345678"
                    className="form-control"
                    value={formData.phone_number}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <div className="form-text small text-muted">
                    Accepts 07XXXXXXXX, 01XXXXXXXX, or +254XXXXXXXXX. Auto-normalized to 254XXXXXXXXX.
                  </div>
                </div>
              </div>
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
                type="submit"
                className="btn btn-sm btn-biz-primary d-inline-flex align-items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 size={15} className="spinner-border spinner-border-sm" /> : null}
                <span>{isEditing ? 'Save Changes' : 'Create Contact'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactModal;
