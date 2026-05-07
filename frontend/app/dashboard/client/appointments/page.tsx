"use client";

import { useEffect, useMemo, useState } from "react";
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
  lawyerId?: {
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

export default function ClientAppointmentsPage() {
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

  const upcomingCount = useMemo(
    () =>
      appointments.filter(
        (item) => item.status === "scheduled" || item.status === "rescheduled",
      ).length,
    [appointments],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-40 animate-pulse rounded bg-surface-container" />
        <div className="grid gap-4 md:grid-cols-2">
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
          You have {upcomingCount} upcoming appointments.
        </p>
      </header>

      {appointments.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No appointments booked yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {appointments.map((apt) => (
            <div
              key={apt._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">
                    {new Date(apt.date).toLocaleDateString()} at {apt.time}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Lawyer: {apt.lawyerId?.name || "Assigned lawyer"}
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
