import React from 'react';

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-5 px-3">
      {Icon && (
        <div className="mb-3 d-inline-flex p-3 bg-light rounded-circle text-muted">
          <Icon size={32} />
        </div>
      )}
      <h6 className="fw-semibold text-dark mb-1">{title}</h6>
      {description && <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '420px' }}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
