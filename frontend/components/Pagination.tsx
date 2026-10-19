"use client";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Disables the buttons while a page is loading */
  disabled?: boolean;
  className?: string;
}

/** "Showing 21–40 of 87" with Previous / Next, for server-paginated admin lists */
export function Pagination({ page, pageSize, total, onPageChange, disabled = false, className = "" }: PaginationProps) {
  if (total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.min((page - 1) * pageSize + 1, total);
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center justify-between gap-3 text-sm text-on-surface-variant sm:flex-row ${className}`}
    >
      <span aria-live="polite">
        Showing {first}–{last} of {total}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
