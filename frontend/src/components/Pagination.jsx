import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  const { page, pages, total, per_page } = pagination;
  const startEntry = (page - 1) * per_page + 1;
  const endEntry = Math.min(page * per_page, total);

  return (
    <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 pt-3 px-1 border-top mt-3 text-center text-sm-start">
      <div className="text-muted small">
        Showing <span className="fw-medium text-dark">{startEntry}</span> to{' '}
        <span className="fw-medium text-dark">{endEntry}</span> of{' '}
        <span className="fw-medium text-dark">{total}</span> records
      </div>

      <div className="d-flex align-items-center gap-1">
        <button
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 py-1"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous Page"
          style={{ minHeight: '34px' }}
        >
          <ChevronLeft size={15} />
          <span className="d-none d-sm-inline ms-1">Prev</span>
        </button>

        <span className="px-2 small text-muted">
          Page <strong className="text-dark">{page}</strong> / <strong className="text-dark">{pages}</strong>
        </span>

        <button
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center px-2 py-1"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next Page"
          style={{ minHeight: '34px' }}
        >
          <span className="d-none d-sm-inline me-1">Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
