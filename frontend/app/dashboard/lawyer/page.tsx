"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";
import { DashboardStats } from "../../../types/dashboard";

type ConsultationStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

interface ConsultationSummary {
  _id: string;
  status: ConsultationStatus;
}

interface CaseSummary {
  _id: string;
  status: string;
}

export default function LawyerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [consultationsResponse, casesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/consultations/my-consultations`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/api/cases/my-cases`, {
            credentials: "include",
          }),
        ]);

        if (!consultationsResponse.ok)
          throw new Error("Failed to fetch consultations");
        if (!casesResponse.ok) throw new Error("Failed to fetch cases");

        const consultationsData = await consultationsResponse.json();
        const casesData = await casesResponse.json();

        const consultations = (consultationsData.consultations ??
          []) as ConsultationSummary[];
        const cases = (casesData.data ?? []) as CaseSummary[];

        const pendingAppointments = consultations.filter(
          (item) =>
            item.status === "scheduled" || item.status === "rescheduled",
        ).length;
        const completedAppointments = consultations.filter(
          (item) => item.status === "completed",
        ).length;

        const resolvedStatuses = new Set(["closed", "won", "lost"]);
        const resolvedCases = cases.filter((item) =>
          resolvedStatuses.has(item.status),
        ).length;
        const activeCases = cases.length - resolvedCases;

        setStats({
          totalAppointments: consultations.length,
          pendingAppointments,
          completedAppointments,
          activeCases,
          resolvedCases,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading)
    return (
      <div className="text-center text-on-surface">Loading dashboard...</div>
    );
  if (error) return <div className="text-error">Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Pending Appointments"
            value={stats.pendingAppointments}
          />
          <StatsCard label="Completed" value={stats.completedAppointments} />
          <StatsCard label="Active Cases" value={stats.activeCases} />
          <StatsCard label="Resolved Cases" value={stats.resolvedCases} />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Appointment overview
          </h3>
          <p className="mt-3 text-sm text-on-surface-variant">
            Keep an eye on your consultation load and see what requires follow-up.
          </p>
          <div className="mt-6 space-y-3">
            <SummaryRow
              label="Pending appointments"
              value={stats.pendingAppointments}
            />
            <SummaryRow
              label="Completed appointments"
              value={stats.completedAppointments}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Case workload
          </h3>
          <p className="mt-3 text-sm text-on-surface-variant">
            Review the balance between active case work and resolved matters.
          </p>
          <div className="mt-6 space-y-3">
            <SummaryRow label="Active cases" value={stats.activeCases} />
            <SummaryRow label="Resolved cases" value={stats.resolvedCases} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
        <h3 className="font-display text-lg font-semibold text-on-surface">
          Next steps
        </h3>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          Use the sidebar links to jump directly into your appointments and case listings. Prioritize pending consultations and update case records as soon as hearings are scheduled.
        </p>
      </section>
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

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface p-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}
