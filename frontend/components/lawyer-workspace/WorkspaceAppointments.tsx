"use client";

import { getWorkspaceConsultations, type WorkspaceLawyerId } from "../../lib/workspace";
import { useWorkspace } from "./useWorkspace";
import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  Consultation,
  ConsultationStatus,
  CONSULTATION_STATUS_COLORS,
  CONSULTATION_STATUS_LABELS,
  CONSULTATION_TYPE_LABELS,
  updateConsultationStatus,
} from "../../lib/dashboard";
import { API_BASE_URL } from "../../lib/api";
import { apiFetch } from "../../lib/http";

const isActive = (status: ConsultationStatus) =>
  status === "scheduled" || status === "rescheduled";

const matchesTab = (status: ConsultationStatus, tab: ConsultationStatus | "all") =>
  tab === "all" || (tab === "scheduled" ? isActive(status) : status === tab);

const STATUS_TABS: { label: string; value: ConsultationStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export function WorkspaceAppointments({ lawyerId }: { lawyerId: WorkspaceLawyerId }) {
  const workspace = useWorkspace(lawyerId);
  const canManage = workspace.can("appointments.manage");
  const [appointments, setAppointments] = useState<Consultation[]>([]);
  const [filtered, setFiltered] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<ConsultationStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    getWorkspaceConsultations(lawyerId)
      .then((data) => {
        setAppointments(data);
        setFiltered(data);
      })
      .catch((err) => toast.error(err.message || "Failed to load appointments"))
      .finally(() => setIsLoading(false));
  }, [lawyerId]);

  useEffect(() => {
    if (activeTab === "all") {
      setFiltered(appointments);
    } else {
      setFiltered(appointments.filter((a) => matchesTab(a.status, activeTab)));
    }
  }, [activeTab, appointments]);

  const handleConfirm = async (id: string) => {
    setConfirmingId(id);
    const toastId = toast.loading("Confirming appointment...");
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/consultations/${id}/confirm`, {
        method: "PUT",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, lawyerConfirmed: true } : a)),
      );
      if (selected?._id === id) setSelected((prev) => prev && { ...prev, lawyerConfirmed: true });
      toast.success("Appointment confirmed.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm", { id: toastId });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: ConsultationStatus,
    notes?: string,
  ) => {
    setUpdatingId(id);
    const toastId = toast.loading("Updating status...");
    try {
      await updateConsultationStatus(id, status, notes);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status } : a)),
      );
      if (selected?._id === id) setSelected((prev) => prev && { ...prev, status });
      toast.success(`Appointment marked as ${status}.`, { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status", { id: toastId });
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

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => isActive(a.status)).length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="font-display text-2xl font-semibold text-heading">
          Appointments
        </h3>
        <p className="text-sm text-on-surface-variant">
          {workspace.isOwn
            ? "Manage your scheduled consultations."
            : `${workspace.lawyerName ?? "The lawyer"}'s consultations.`}
        </p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Appointments" value={stats.total} />
        <StatsCard label="Scheduled" value={stats.scheduled} />
        <StatsCard label="Completed" value={stats.completed} />
        <StatsCard label="Cancelled" value={stats.cancelled} />
      </div>

      {/* Tabs */}
      <div className="panel flex gap-1 overflow-x-auto p-1">
        {STATUS_TABS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-surface-raised font-semibold text-on-surface shadow-[inset_0_1px_0_var(--highlight),0_1px_2px_rgb(16_24_40/0.12)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1 opacity-60">
                ({appointments.filter((a) => matchesTab(a.status, tab.value)).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-on-surface-variant">
          No appointments found.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container text-left text-xs font-semibold text-on-surface-variant">
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((apt) => (
                <tr
                  key={apt._id}
                  className="transition-colors hover:bg-surface-container/60"
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
                      timeZone: "UTC",
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
                      className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold ${CONSULTATION_STATUS_COLORS[apt.status]}`}
                    >
                      {CONSULTATION_STATUS_LABELS[apt.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(apt)}
                      className="btn btn-ghost btn-sm min-h-8 px-2 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-gold-ink" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(10_22_40/0.5)] p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="card w-full max-w-lg p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-heading">
                Appointment Details
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="btn btn-ghost btn-icon"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Client" value={selected.clientId?.name || "—"} />
              <Row label="Email" value={selected.clientId?.email || "—"} />
              <Row label="Phone" value={selected.clientId?.phone || selected.clientPhone || "—"} />
              <Row
                label="Date"
                value={new Date(selected.date).toLocaleDateString("en-BD", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              />
              <Row label="Time" value={selected.time} />
              <Row label="Type" value={CONSULTATION_TYPE_LABELS[selected.consultationType]} />
              {selected.meetingMode && (
                <Row label="Meeting Mode" value={selected.meetingMode.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
              )}
              <Row label="Subject" value={selected.subject} />
              <Row label="Description" value={selected.description} />
              {selected.notes && <Row label="Notes" value={selected.notes} />}
              {selected.whatsappDocSharing && (
                <div className="panel px-3 py-2 text-xs text-on-surface-variant">
                  Client will share documents via WhatsApp
                  {selected.whatsappDocNote && `: ${selected.whatsappDocNote}`}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Status</span>
                <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold ${CONSULTATION_STATUS_COLORS[selected.status]}`}>
                  {CONSULTATION_STATUS_LABELS[selected.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Confirmation</span>
                <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold ${selected.lawyerConfirmed ? "bg-success/15 text-success" : "bg-yellow-500/15 text-yellow-600"}`}>
                  {selected.lawyerConfirmed ? (workspace.isOwn ? "Confirmed by you" : "Confirmed") : "Not yet confirmed"}
                </span>
              </div>
            </div>

            {canManage && isActive(selected.status) && (
              <div className="mt-5 flex flex-col gap-2 border-t border-outline-variant pt-4">
                {!selected.lawyerConfirmed && (
                  <button
                    type="button"
                    disabled={confirmingId === selected._id}
                    onClick={() => handleConfirm(selected._id)}
                    className="btn btn-secondary btn-block"
                  >
                    {confirmingId === selected._id ? "Confirming..." : "Confirm Booking"}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={updatingId === selected._id}
                    onClick={() => handleStatusChange(selected._id, "completed")}
                    className="btn btn-secondary flex-1 text-success"
                  >
                    Mark Completed
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === selected._id}
                    onClick={() => handleStatusChange(selected._id, "cancelled")}
                    className="btn btn-secondary flex-1 text-error"
                  >
                    Cancel
                  </button>
                </div>
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

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-heading">
        {value}
      </p>
    </div>
  );
}
