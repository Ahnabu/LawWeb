"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import { Calendar, Clock, User, Scale, ChevronDown } from "lucide-react";

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
  lawyerId?: { name?: string; email?: string; barId?: string };
}

const STATUS_OPTIONS = ["all", "scheduled", "completed", "cancelled", "rescheduled"] as const;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600",
  completed: "bg-green-500/10 text-green-700",
  cancelled: "bg-error/10 text-error",
  rescheduled: "bg-secondary/10 text-secondary",
};

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

  const fetchConsultations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await fetch(`${API_BASE_URL}/api/admin/consultations${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");
      const data = await response.json();
      setConsultations(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchConsultations();
  }, [fetchConsultations]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/consultations/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!response.ok) throw new Error("Failed to update status");
      setConsultations((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, status: newStatus as ConsultationItem["status"] } : c,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
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

      {/* Stats */}
      {!isLoading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total Appointments" value={consultations.length} />
          <StatsCard
            label="Scheduled"
            value={consultations.filter((c) => c.status === "scheduled").length}
          />
          <StatsCard
            label="Completed"
            value={consultations.filter((c) => c.status === "completed").length}
          />
          <StatsCard
            label="Cancelled"
            value={consultations.filter((c) => c.status === "cancelled").length}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
              statusFilter === s
                ? "bg-primary text-on-primary"
                : "border border-outline-variant bg-surface text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="h-24 animate-pulse rounded-xl border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : consultations.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          No appointments found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((item) => (
            <div
              key={item._id}
              className="rounded-xl border border-outline-variant bg-surface-container overflow-hidden"
            >
              {/* Main row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-on-surface font-medium">
                    <Calendar className="h-4 w-4 text-secondary shrink-0" />
                    {new Date(item.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <Clock className="h-4 w-4 shrink-0" />
                    {item.time}
                  </span>
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <User className="h-4 w-4 shrink-0" />
                    {item.clientId?.name || "—"}
                  </span>
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <Scale className="h-4 w-4 shrink-0" />
                    {item.lawyerId?.name || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      STATUS_COLORS[item.status] ?? "bg-surface text-on-surface"
                    }`}
                  >
                    {item.status}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expandedId === item._id ? null : item._id)
                    }
                    className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:bg-surface transition"
                    aria-label="Toggle details"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expandedId === item._id ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === item._id && (
                <div className="border-t border-outline-variant bg-surface p-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    {item.subject && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Subject</p>
                        <p className="mt-0.5 text-on-surface">{item.subject}</p>
                      </div>
                    )}
                    {item.consultationType && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Type</p>
                        <p className="mt-0.5 text-on-surface">
                          {TYPE_LABELS[item.consultationType] ?? item.consultationType}
                        </p>
                      </div>
                    )}
                    {item.clientId?.email && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Client Email</p>
                        <p className="mt-0.5 text-on-surface">{item.clientId.email}</p>
                      </div>
                    )}
                    {item.clientId?.phone && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Client Phone</p>
                        <p className="mt-0.5 text-on-surface">{item.clientId.phone}</p>
                      </div>
                    )}
                    {item.lawyerId?.barId && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Bar ID</p>
                        <p className="mt-0.5 text-on-surface">{item.lawyerId.barId}</p>
                      </div>
                    )}
                  </div>
                  {item.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Description</p>
                      <p className="mt-1 text-sm text-on-surface">{item.description}</p>
                    </div>
                  )}
                  {item.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Notes</p>
                      <p className="mt-1 text-sm text-on-surface">{item.notes}</p>
                    </div>
                  )}

                  {/* Status update actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <p className="w-full text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      Update Status
                    </p>
                    {(["scheduled", "completed", "cancelled", "rescheduled"] as const).map(
                      (s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={item.status === s || updatingId === item._id}
                          onClick={() => updateStatus(item._id, s)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition disabled:opacity-40 ${
                            item.status === s
                              ? "border-primary bg-primary/10 text-primary cursor-default"
                              : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                          }`}
                        >
                          {updatingId === item._id ? "Saving…" : s}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-on-surface">
        {value}
      </p>
    </div>
  );
}
