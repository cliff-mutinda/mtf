import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Send, Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import mpesaService from '../services/mpesaService';
import StatusBadge from './StatusBadge';

export function SendMpesaModal({ isOpen, onClose, contact, onCompleted }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // States: 'input' -> 'sent'
  const [step, setStep] = useState('input');
  const [txDetails, setTxDetails] = useState(null);
  const [pollStatus, setPollStatus] = useState('Pending');
  const [pollLoading, setPollLoading] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError('');
      setStep('input');
      setTxDetails(null);
      setPollStatus('Pending');
      setPollLoading(false);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, contact]);

  if (!isOpen || !contact) return null;

  const handleSendPayment = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero (minimum 1 KSh).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await mpesaService.initiateStkPush({
        contact_id: contact.id,
        amount: numAmount
      });

      if (res.success) {
        setTxDetails(res);
        setPollStatus('Pending');
        setStep('sent');
        startPolling(res.checkout_request_id);
      } else {
        setError(res.message || 'Failed to send M-Pesa prompt.');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with M-Pesa service.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (checkoutId) => {
    if (!checkoutId) return;
    try {
      setPollLoading(true);
      const res = await mpesaService.getTransactionStatus(checkoutId);
      if (res.success && res.data) {
        const currentStatus = res.data.status;
        setPollStatus(currentStatus);
        setTxDetails((prev) => ({ ...prev, ...res.data }));
        if (currentStatus === 'Successful' || currentStatus === 'Failed' || currentStatus === 'Cancelled') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (onCompleted) onCompleted(res.data);
        }
      }
    } catch (err) {
      // keep polling silently
    } finally {
      setPollLoading(false);
    }
  };

  const startPolling = (checkoutId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    let attempts = 0;
    pollIntervalRef.current = setInterval(() => {
      attempts += 1;
      checkStatus(checkoutId);
      if (attempts >= 15) { // Stop after 45 seconds
        clearInterval(pollIntervalRef.current);
      }
    }, 3000);
  };

  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content biz-modal-content">
          <div className="modal-header border-bottom px-3 px-md-4 py-3 align-items-center">
            <h5 className="modal-title fs-6 fw-semibold d-flex align-items-center gap-2 mb-0">
              <Smartphone size={18} className="text-success flex-shrink-0" />
              <span>Send M-Pesa STK Push</span>
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          {step === 'input' ? (
            <form onSubmit={handleSendPayment} className="d-flex flex-column" style={{ minHeight: 0 }}>
              <div className="modal-body px-3 px-md-4 py-3">
                {error && (
                  <div className="alert alert-danger py-2 px-3 small d-flex align-items-start gap-2 mb-3">
                    <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                    <div className="text-break-word">{error}</div>
                  </div>
                )}

                <div className="mb-3 p-3 bg-light rounded border">
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <span className="text-muted small d-block">Recipient Name</span>
                      <strong className="text-dark text-break-word">{contact.full_name || 'Selected Contact'}</strong>
                    </div>
                    <div className="col-12 col-sm-6">
                      <span className="text-muted small d-block">Verified Phone</span>
                      <span className="font-monospace text-dark fw-medium text-break-word">+{contact.phone_number}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium mb-1">
                    Amount (KSh) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted">KSh</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="300000"
                      required
                      placeholder="e.g. 500"
                      className="form-control"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (error) setError('');
                      }}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <div className="form-text small text-muted">
                    An instant STK prompt will be sent to the recipient's phone requesting PIN authorization.
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
                  className="btn btn-sm btn-mpesa d-inline-flex align-items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="spinner-border spinner-border-sm" />
                      <span>Sending request...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="modal-body px-3 px-md-4 py-4 text-center">
              <div className="mb-3">
                {pollStatus === 'Successful' ? (
                  <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle d-inline-flex">
                    <CheckCircle2 size={36} />
                  </div>
                ) : pollStatus === 'Pending' ? (
                  <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle d-inline-flex">
                    <Loader2 size={36} className="spinner-border" />
                  </div>
                ) : (
                  <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle d-inline-flex">
                    <XCircle size={36} />
                  </div>
                )}
              </div>

              <h6 className="fw-semibold text-dark mb-1">
                {pollStatus === 'Successful'
                  ? 'Payment Completed Successfully!'
                  : pollStatus === 'Pending'
                  ? 'M-Pesa Prompt Sent'
                  : 'Payment Request Ended'}
              </h6>

              <p className="text-muted small mb-3 text-break-word">
                {pollStatus === 'Pending'
                  ? "Check recipient's phone to enter M-Pesa PIN and authorize KSh " + amount + '.'
                  : pollStatus === 'Successful'
                  ? `Payment of KSh ${txDetails?.amount || amount} was received successfully.`
                  : txDetails?.result_description || 'Payment was cancelled or could not be completed.'}
              </p>

              <div className="p-3 bg-light rounded border text-start small mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Status:</span>
                  <StatusBadge status={pollStatus} />
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Recipient:</span>
                  <span className="fw-medium text-dark text-break-word">{contact.full_name}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Phone:</span>
                  <span className="font-monospace text-dark">+{contact.phone_number}</span>
                </div>
                {txDetails?.receipt_number && (
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Receipt:</span>
                    <span className="font-monospace fw-bold text-success">{txDetails.receipt_number}</span>
                  </div>
                )}
                {txDetails?.checkout_request_id && (
                  <div className="mt-2 pt-2 border-top">
                    <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Checkout ID:</span>
                    <span className="mono-break small text-muted d-block" style={{ fontSize: '0.75rem' }}>
                      {txDetails.checkout_request_id}
                    </span>
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-center gap-2 flex-wrap">
                {pollStatus === 'Pending' && (
                  <button
                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                    onClick={() => checkStatus(txDetails?.checkout_request_id)}
                    disabled={pollLoading}
                  >
                    <RefreshCw size={13} className={pollLoading ? 'spinner-border spinner-border-sm' : ''} />
                    <span>Check Status</span>
                  </button>
                )}
                <button
                  className="btn btn-sm btn-biz-primary"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendMpesaModal;
