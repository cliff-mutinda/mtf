import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, X } from 'lucide-react';
import contactService from '../services/contactService';

export function CsvImportModal({ isOpen, onClose, onImportCompleted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setSummaryData(null);
    setError('');
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid .csv file.');
      return;
    }

    setSelectedFile(file);
    setError('');
    setLoading(true);

    try {
      const res = await contactService.previewCsv(file);
      if (res.success) {
        setPreviewData(res);
      } else {
        setError(res.message || 'Could not parse CSV preview.');
      }
    } catch (err) {
      setError(err.message || 'Failed to read CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');

    try {
      const res = await contactService.importCsv(selectedFile);
      if (res.success && res.summary) {
        setSummaryData(res.summary);
        if (onImportCompleted) {
          onImportCompleted(res.summary);
        }
      } else {
        setError(res.message || 'Import failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to import contacts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content biz-modal-content">
          <div className="modal-header border-bottom px-3 px-md-4 py-3 align-items-center">
            <h5 className="modal-title fs-6 fw-semibold d-flex align-items-center gap-2 mb-0">
              <Upload size={18} className="text-primary flex-shrink-0" />
              <span>Import Google Contacts CSV</span>
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={handleClose}
              disabled={loading}
            ></button>
          </div>

          <div className="modal-body px-3 px-md-4 py-3">
            {error && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-start gap-2 mb-3">
                <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                <div className="text-break-word">{error}</div>
              </div>
            )}

            {/* Step 1: File selection */}
            {!selectedFile && !loading && (
              <div
                className="border border-2 border-dashed rounded p-3 p-md-4 text-center cursor-pointer bg-light"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <div className="mb-2 text-primary">
                  <FileText size={36} className="mx-auto" />
                </div>
                <h6 className="fw-medium text-dark mb-1">Click to select Google Contacts CSV</h6>
                <p className="text-muted small mb-3">
                  Extracts First Name, Middle Name, Last Name, and Phone 1 - Value.
                </p>
                <button type="button" className="btn btn-sm btn-biz-primary">
                  Select File (.csv)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="d-none"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* Loading Spinner */}
            {loading && !summaryData && (
              <div className="text-center py-5">
                <Loader2 size={32} className="spinner-border text-primary mb-2" />
                <p className="text-muted small mb-0">
                  {previewData ? 'Importing and deduplicating contacts...' : 'Analyzing CSV file...'}
                </p>
              </div>
            )}

            {/* Step 2: Preview Mode */}
            {previewData && !summaryData && !loading && (
              <div>
                <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between p-2 bg-light rounded border mb-3 gap-2">
                  <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                    <FileText size={18} className="text-primary flex-shrink-0" />
                    <div style={{ minWidth: 0 }}>
                      <strong className="text-dark small d-block text-truncate">{previewData.filename}</strong>
                      <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>
                        {previewData.total_rows} total rows &bull; {previewData.valid_count} valid &bull; {previewData.invalid_count} invalid
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary flex-shrink-0"
                    onClick={handleReset}
                  >
                    Change File
                  </button>
                </div>

                <div className="border rounded overflow-hidden mb-3">
                  <div className="table-responsive" style={{ maxHeight: '220px' }}>
                    <table className="table biz-table mb-0">
                      <thead>
                        <tr>
                          <th>First Name</th>
                          <th>Middle Name</th>
                          <th>Last Name</th>
                          <th>Phone</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.preview && previewData.preview.length > 0 ? (
                          previewData.preview.map((row, idx) => (
                            <tr key={idx}>
                              <td className="fw-medium text-nowrap">{row.first_name || '—'}</td>
                              <td className="text-nowrap">{row.middle_name || '—'}</td>
                              <td className="text-nowrap">{row.last_name || '—'}</td>
                              <td className="font-monospace text-nowrap">{row.phone_number || '—'}</td>
                              <td>
                                {row.status === 'Valid' ? (
                                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-1 px-2">
                                    Valid
                                  </span>
                                ) : row.status === 'Duplicate in File' ? (
                                  <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 py-1 px-2">
                                    Duplicate
                                  </span>
                                ) : (
                                  <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 py-1 px-2">
                                    Invalid
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center text-muted py-3">
                              No rows could be parsed.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-muted small mb-0">
                  Showing first {Math.min(50, previewData.preview?.length || 0)} rows. Duplicate phone numbers will be automatically merged or skipped.
                </p>
              </div>
            )}

            {/* Step 3: Summary after Import */}
            {summaryData && (
              <div className="py-2">
                <div className="text-center mb-3">
                  <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle d-inline-flex mb-2">
                    <CheckCircle2 size={36} />
                  </div>
                  <h6 className="fw-semibold text-dark">Import Process Completed</h6>
                  <p className="text-muted small">
                    Contacts have been parsed, normalized, deduplicated, and stored in the database.
                  </p>
                </div>

                <div className="card border">
                  <div className="card-body p-3">
                    <h6 className="card-subtitle mb-2 text-muted small text-uppercase fw-semibold">
                      Import Results Summary
                    </h6>
                    <ul className="list-group list-group-flush small">
                      <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>Total rows parsed:</span>
                        <strong className="text-dark">{summaryData.total_rows}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>Valid contacts:</span>
                        <strong className="text-dark">{summaryData.valid_contacts}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>Duplicates removed (in file &amp; DB):</span>
                        <span className="text-warning fw-bold">{summaryData.duplicates_removed}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span>Invalid contacts (unparseable):</span>
                        <span className="text-danger fw-bold">{summaryData.invalid_contacts}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center px-0 bg-light rounded mt-1 p-2">
                        <span className="fw-semibold text-dark">New contacts saved:</span>
                        <strong className="text-success fs-6">{summaryData.imported}</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer border-top px-3 px-md-4 py-2 bg-light d-flex justify-content-end gap-2 flex-wrap">
            {summaryData ? (
              <button
                type="button"
                className="btn btn-sm btn-biz-primary"
                onClick={handleClose}
              >
                Close &amp; View Contacts
              </button>
            ) : previewData ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-biz-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-biz-primary d-inline-flex align-items-center gap-2"
                  onClick={handleConfirmImport}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={15} className="spinner-border spinner-border-sm" /> : <ArrowRight size={15} />}
                  <span>Import Contacts</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-biz-secondary"
                onClick={handleClose}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CsvImportModal;
