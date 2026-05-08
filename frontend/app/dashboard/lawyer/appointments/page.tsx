"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import {
  Consultation,
  ConsultationStatus,
  CONSULTATION_STATUS_COLORS,
  CONSULTATION_STATUS_LABELS,
  CONSULTATION_TYPE_LABELS,
  getMyConsultations,
  updateConsultationStatus,
} from "../../../../lib/dashboard";

const STATUS_TABS: { label: string; value: ConsultationStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function LawyerAppointmentsPage() {
  const [appointments, setAppointments] = useState<Consultation[]>([]);
  const [filtered, setFiltered] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<ConsultationStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getMyConsultations()
      .then((data) => {
        setAppointments(data);
        setFiltered(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      setFiltered(appointments);
    } else {
      setFiltered(appointments.filter((a) => a.status === activeTab));
    }
  }, [activeTab, appointments]);

  const handleStatusChange = async (
    id: string,
    status: ConsultationStatus,
    notes?: string,
  ) => {
    setUpdatingId(id);
    try {
      await updateConsultationStatus(id, status, notes);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status } : a)),
      );
      if (selected?._id === id) setSelected((prev) => prev && { ...prev, status });
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-surface-container" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded bg-surface-container"
          />
        ))}
      </div>
    );
  }

  if (error) return <div className="text-error">Error: {error}</div>;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Appointments
        </h3>
        <p className="text-sm text-on-surface-variant">
          Manage your scheduled consultations.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-1">
        {STATUS_TABS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1 opacity-60">
                ({appointments.filter((a) => a.status === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          No appointments found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface">
              {filtered.map((apt) => (
                <tr
                  key={apt._id}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">
                    {apt.clientId?.name || "—"}
                    <div className="text-xs text-on-surface-variant">
                      {apt.clientId?.email}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">
                    {new Date(apt.date).toLocaleDateString("en-BD", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    <div className="text-xs">{apt.time}</div>
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {CONSULTATION_TYPE_LABELS[apt.consultationType]}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface max-w-40 truncate">
                    {apt.subject}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONSULTATION_STATUS_COLORS[apt.status]}`}
                    >
                      {CONSULTATION_STATUS_LABELS[apt.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(apt)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-on-surface">
                Appointment Details
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="rounded-full p-1 hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Client" value={selected.clientId?.name || "—"} />
              <Row label="Email" value={selected.clientId?.email || "—"} />
              <Row label="Phone" value={selected.clientId?.phone || "—"} />
              <Row
                label="Date"
                value={new Date(selected.date).toLocaleDateString("en-BD", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              <Row label="Time" value={selected.time} />
              <Row
                label="Type"
                value={CONSULTATION_TYPE_LABELS[selected.consultationType]}
              />
              <Row label="Subject" value={selected.subject} />
              <Row label="Description" value={selected.description} />
              {selected.notes && (
                <Row label="Notes" value={selected.notes} />
              )}
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Status</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONSULTATION_STATUS_COLORS[selected.status]}`}
                >
                  {CONSULTATION_STATUS_LABELS[selected.status]}
                </span>
              </div>
            </div>

            {/* Quick status update */}
            {selected.status === "scheduled" && (
              <div className="mt-5 flex gap-2 border-t border-outline-variant pt-4">
                <button
                  type="button"
                  disabled={updatingId === selected._id}
                  onClick={() => handleStatusChange(selected._id, "completed")}
                  className="flex-1 rounded-lg bg-success/15 py-2 text-sm font-semibold text-success hover:bg-success/25 disabled:opacity-50 transition-colors"
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  disabled={updatingId === selected._id}
                  onClick={() => handleStatusChange(selected._id, "cancelled")}
                  className="flex-1 rounded-lg bg-error/10 py-2 text-sm font-semibold text-error hover:bg-error/20 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-on-surface-variant font-medium shrink-0">{label}</span>
      <span className="text-on-surface text-right">{value}</span>
    </div>
  );
}
