import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

export function StatusBadge({ status }) {
  const normStatus = (status || 'Pending').toLowerCase();

  if (normStatus === 'successful') {
    return (
      <span className="badge-status badge-status-successful">
        <CheckCircle2 size={13} />
        Successful
      </span>
    );
  }

  if (normStatus === 'pending') {
    return (
      <span className="badge-status badge-status-pending">
        <Clock size={13} />
        Pending
      </span>
    );
  }

  if (normStatus === 'cancelled') {
    return (
      <span className="badge-status badge-status-cancelled">
        <AlertCircle size={13} />
        Cancelled
      </span>
    );
  }

  return (
    <span className="badge-status badge-status-failed">
      <XCircle size={13} />
      {status || 'Failed'}
    </span>
  );
}

export default StatusBadge;
