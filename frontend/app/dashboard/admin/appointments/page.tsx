"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../../../lib/http";
import { Pagination } from "../../../../components/Pagination";

interface ConsultationItem {
  _id: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  consultationType?: string;
  subject?: string;
  description?: string;
  notes?: string;
  clientId?: { name?: string; email?: string; phone?: string };
  lawyerId?: { name?: string; email?: string; barId?: string } | null;
  // Kept after the lawyer's account is deleted (lawyerId is then null)
  formerLawyerName?: string;
  cancellationReason?: string;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["all", "scheduled", "completed", "cancelled", "rescheduled"] as const;

// Neutral chip with a small coloured dot per status
const STATUS_DOTS: Record<string, string> = {
  scheduled: "bg-sky-600",
  completed: "bg-success",
  cancelled: "bg-error",
  rescheduled: "bg-secondary",
};

// Shared column template for the header row and each appointment row (md+)
const ROW_GRID = "md:grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_8.5rem_2.5rem]";

const TYPE_LABELS: Record<string, string> = {
  "initial-consultation": "Initial Consultation",
  "follow-up": "Follow-up",
  "document-review": "Document Review",
  "case-discussion": "Case Discussion",
};

export default function AdminAppointmentsPage() {
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Per-status totals across all appointments (ignore the filter), for the stat cards
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Ignores responses that arrive after a newer request was started
  const requestId = useRef(0);

  const fetchConsultations = useCallback(async (options: { quiet?: boolean } = {}) => {
    const id = ++requestId.current;
    if (!options.quiet) setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const response = await apiFetch(`${API_BASE_URL}/api/admin/consultations?${params.toString()}`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(data.message || "Failed to fetch appointments");
      const rows: ConsultationItem[] = data.data ?? [];
      const nextTotal: number = data.meta?.total ?? rows.length;
      setConsultations(rows);
      setTotal(nextTotal);
      setCounts(data.meta?.counts ?? {});
      // The last item on a page moved out of the filter: step back instead of showing an empty page
      if (rows.length === 0 && page > 1 && nextTotal > 0) setPage((p) => Math.max(1, p - 1));
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    void fetchConsultations();
  }, [fetchConsultations]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/admin/consultations/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update status");
      }
      setConsultations((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, status: newStatus as ConsultationItem["status"] } : c,
        ),
      );
      // Refresh the stat cards (and drop the row if it no longer matches the filter)
      void fetchConsultations({ quiet: true });
      toast.success(`Appointment marked ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            Appointments
          </h3>
          <p className="text-sm text-on-surface-variant">
            Review and manage all consultations across the platform.
          </p>
        </div>
      </header>

      {/* Filters (each shows its total across all appointments) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={statusFilter === s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
              setExpandedId(null);
            }}
            className="chip capitalize"
          >
            {s === "all" ? "All appointments" : s}
            {!isLoading && !error && (
              <span className="tabular-nums opacity-70">{counts[s] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card h-72 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : consultations.length === 0 ? (
        <div className="card p-10 text-center text-sm text-on-surface-variant">
          No appointments found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            {/* Column headings (wide screens) */}
            <div className={`hidden gap-x-4 border-b border-outline-variant bg-surface-container px-5 py-2.5 text-sm font-semibold text-on-surface-variant md:grid ${ROW_GRID}`}>
              <span>Date</span>
              <span>Client</span>
              <span>Lawyer</span>
              <span>Status</span>
              <span className="sr-only">Details</span>
            </div>
            <ul className="divide-y divide-outline-variant">
              {consultations.map((item) => {
                const expanded = expandedId === item._id;
                return (
                  <li key={item._id} className={expanded ? "bg-surface-container/40" : ""}>
                    {/* Main row */}
                    <div className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5 ${ROW_GRID}`}>
                      <div className="text-sm">
                        <p className="font-semibold text-on-surface">
                          {new Date(item.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </p>
                        <p className="text-on-surface-variant tabular-nums">{item.time}</p>
                      </div>
                      <div className="col-span-2 row-start-2 min-w-0 text-sm text-on-surface md:col-span-1 md:row-start-auto">
                        <span className="text-on-surface-variant md:hidden">Client: </span>
                        {item.clientId?.name || "—"}
                      </div>
                      <div className="col-span-2 min-w-0 text-sm text-on-surface md:col-span-1">
                        <span className="text-on-surface-variant md:hidden">Lawyer: </span>
                        {item.lawyerId?.name || (item.formerLawyerName ? `${item.formerLawyerName} (removed)` : "—")}
                      </div>
                      <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                        <StatusChip status={item.status} />
                      </div>
                      <div className="hidden md:block">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : item._id)}
                          className="btn btn-ghost btn-icon"
                          aria-label="Toggle details"
                          aria-expanded={expanded}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : item._id)}
                        className="btn btn-ghost btn-sm col-span-2 -ml-3 justify-self-start md:hidden"
                        aria-expanded={expanded}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                        Details
                      </button>
                    </div>

                    {/* Expanded details */}
                    {expanded && (
                      <div className="space-y-4 border-t border-outline-variant px-4 py-4 sm:px-5">
                        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          {item.subject && <Detail label="Subject">{item.subject}</Detail>}
                          {item.consultationType && (
                            <Detail label="Type">
                              {TYPE_LABELS[item.consultationType] ?? item.consultationType}
                            </Detail>
                          )}
                          {item.clientId?.email && <Detail label="Client Email">{item.clientId.email}</Detail>}
                          {item.clientId?.phone && <Detail label="Client Phone">{item.clientId.phone}</Detail>}
                          {item.lawyerId?.barId && <Detail label="Bar ID">{item.lawyerId.barId}</Detail>}
                        </dl>
                        {(item.description || item.notes || item.cancellationReason) && (
                          <dl className="panel space-y-3 px-4 py-3 text-sm">
                            {item.description && <Detail label="Description">{item.description}</Detail>}
                            {item.notes && <Detail label="Notes">{item.notes}</Detail>}
                            {item.cancellationReason && <Detail label="Cancellation">{item.cancellationReason}</Detail>}
                          </dl>
                        )}

                        {/* Status update actions */}
                        <div>
                          <p className="mb-2 text-sm font-semibold text-on-surface">
                            Update Status
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(["scheduled", "completed", "cancelled", "rescheduled"] as const).map(
                              (s) => (
                                <button
                                  key={s}
                                  type="button"
                                  aria-pressed={item.status === s}
                                  disabled={item.status === s || updatingId === item._id}
                                  onClick={() => updateStatus(item._id, s)}
                                  className={`chip capitalize disabled:cursor-default ${
                                    item.status !== s ? "disabled:opacity-50" : ""
                                  }`}
                                >
                                  {updatingId === item._id ? "Saving…" : s}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(next) => {
              setPage(next);
              setExpandedId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className="chip capitalize">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? "bg-outline"}`} />
      {status}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="mt-0.5 break-words text-on-surface">{children}</dd>
    </div>
  );
}
