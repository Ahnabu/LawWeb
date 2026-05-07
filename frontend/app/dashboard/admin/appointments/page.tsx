"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";

interface ConsultationItem {
  _id: string;
  date: string;
  time: string;
  status: string;
  clientId?: { name?: string; email?: string };
  lawyerId?: { name?: string; email?: string };
  subject?: string;
}

export default function AdminAppointmentsPage() {
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/consultations`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch consultations");
        }
        const data = await response.json();
        setConsultations(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultations();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse rounded bg-surface-container" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`consultation-skeleton-${index}`}
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
          Review scheduled consultations across the platform.
        </p>
      </header>

      {consultations.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No appointments found.
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((item) => (
            <div
              key={item._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">
                    {new Date(item.date).toLocaleDateString()} at {item.time}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Client: {item.clientId?.name || "-"} | Lawyer: {item.lawyerId?.name || "-"}
                  </p>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface">
                  {item.status}
                </span>
              </div>
              {item.subject && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  {item.subject}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
