"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";

type ConsultationStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

interface ConsultationItem {
  _id: string;
  date: string;
  time: string;
  status: ConsultationStatus;
  clientId?: {
    name?: string;
    email?: string;
  };
  subject?: string;
}

const STATUS_STYLES: Record<ConsultationStatus, string> = {
  scheduled: "bg-secondary/10 text-secondary",
  rescheduled: "bg-secondary/10 text-secondary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-error/10 text-error",
};

export default function LawyerAppointmentsPage() {
  const [appointments, setAppointments] = useState<ConsultationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/consultations/my-consultations`,
          { credentials: "include" },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }
        const data = await response.json();
        setAppointments(data.consultations ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-40 animate-pulse rounded bg-surface-container" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`appointment-skeleton-${index}`}
              className="h-24 animate-pulse rounded-lg border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className="text-error">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Appointments
        </h2>
        <p className="text-sm text-on-surface-variant">
          Manage your upcoming sessions and follow-ups.
        </p>
      </header>

      {appointments.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No appointments scheduled yet.
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div
              key={apt._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">
                    {new Date(apt.date).toLocaleDateString()} at {apt.time}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Client: {apt.clientId?.name || "Client"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[apt.status]
                  }`}
                >
                  {apt.status}
                </span>
              </div>
              {apt.subject && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  {apt.subject}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
