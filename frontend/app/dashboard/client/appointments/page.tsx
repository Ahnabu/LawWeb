"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  Consultation,
  ConsultationStatus,
  CONSULTATION_STATUS_COLORS,
  CONSULTATION_STATUS_LABELS,
  CONSULTATION_TYPE_LABELS,
  getMyConsultations,
  cancelConsultation,
} from "../../../../lib/dashboard";

const STATUS_TABS: { label: string; value: ConsultationStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ClientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Consultation[]>([]);
  const [filtered, setFiltered] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<ConsultationStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    getMyConsultations()
      .then((data) => {
        setAppointments(data);
        setFiltered(data);
      })
      .catch((err) => toast.error(err.message || "Failed to load appointments"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      setFiltered(appointments);
    } else {
      setFiltered(appointments.filter((a) => a.status === activeTab));
    }
  }, [activeTab, appointments]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    const toastId = toast.loading("Cancelling appointment...");
    try {
      await cancelConsultation(id);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: "cancelled" as ConsultationStatus } : a)),
      );
      if (selected?._id === id) {
        setSelected((prev) => prev && { ...prev, status: "cancelled" as ConsultationStatus });
      }
      toast.success("Appointment cancelled.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel appointment", { id: toastId });
    } finally {
      setCancellingId(null);
    }
  };

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === "scheduled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-44 animate-pulse rounded bg-surface-container" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-surface-container" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          My Appointments
        </h3>
        <p className="text-sm text-on-surface-variant">
          View and manage your consultations with lawyers.
        </p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Appointments" value={stats.total} />
        <StatsCard label="Scheduled" value={stats.scheduled} />
        <StatsCard label="Completed" value={stats.completed} />
        <StatsCard label="Cancelled" value={stats.cancelled} />
      </div>

      {/* Status filter tabs */}
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
                <th className="px-3 py-2.5">Lawyer</th>
                <th className="px-3 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface">
              {filtered.map((apt) => (
                <tr key={apt._id} className="transition-colors hover:bg-surface-container">
                  <td className="px-3 py-2.5 font-medium text-on-surface">
                    {apt.lawyerId?.name || "—"}
                    <div className="text-xs text-on-surface-variant">{apt.lawyerId?.barId && `Bar: ${apt.lawyerId.barId}`}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-on-surface-variant">
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
                  <td className="px-3 py-2.5 max-w-40 truncate text-on-surface">{apt.subject}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONSULTATION_STATUS_COLORS[apt.status]}`}>
                      {CONSULTATION_STATUS_LABELS[apt.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(apt)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
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

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-on-surface">
                Appointment Details
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Lawyer" value={selected.lawyerId?.name || "—"} />
              {selected.lawyerId?.barId && (
                <Row label="Bar ID" value={selected.lawyerId.barId} />
              )}
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
              <Row label="Type" value={CONSULTATION_TYPE_LABELS[selected.consultationType]} />
              {selected.meetingMode && (
                <Row label="Meeting Mode" value={selected.meetingMode.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} />
              )}
              <Row label="Subject" value={selected.subject} />
              <Row label="Description" value={selected.description} />
              {selected.clientPhone && (
                <Row label="Contact Phone" value={selected.clientPhone} />
              )}
              {selected.notes && <Row label="Lawyer Notes" value={selected.notes} />}
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface-variant">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONSULTATION_STATUS_COLORS[selected.status]}`}>
                  {CONSULTATION_STATUS_LABELS[selected.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface-variant">Lawyer Confirmed</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${selected.lawyerConfirmed ? "bg-success/15 text-success" : "bg-yellow-500/15 text-yellow-600"}`}>
                  {selected.lawyerConfirmed ? "Confirmed" : "Pending Confirmation"}
                </span>
              </div>
              {selected.whatsappDocSharing && (
                <div className="rounded-lg bg-surface px-3 py-2 text-xs text-on-surface-variant">
                  Documents will be shared via WhatsApp
                  {selected.whatsappDocNote && `: ${selected.whatsappDocNote}`}
                </div>
              )}
            </div>

            {selected.status === "scheduled" && (
              <div className="mt-5 border-t border-outline-variant pt-4">
                <button
                  type="button"
                  disabled={cancellingId === selected._id}
                  onClick={() => handleCancel(selected._id)}
                  className="w-full rounded-lg bg-error/10 py-2 text-sm font-semibold text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                >
                  {cancellingId === selected._id ? "Cancelling..." : "Cancel Appointment"}
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
      <span className="shrink-0 font-medium text-on-surface-variant">{label}</span>
      <span className="text-right text-on-surface">{value}</span>
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
