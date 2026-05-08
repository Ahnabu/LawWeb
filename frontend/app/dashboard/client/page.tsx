"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";
import { DashboardStats } from "../../../types/dashboard";

type ConsultationStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

interface AppointmentSummary {
  id: string;
  date: string;
  time: string;
  status: ConsultationStatus;
  lawyerName?: string;
}

interface CaseSummary {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface ConsultationApiItem {
  _id?: string;
  id?: string;
  date?: string;
  time?: string;
  status?: ConsultationStatus;
  lawyerId?: {
    name?: string;
  } | null;
}

interface ConsultationsApiResponse {
  consultations?: ConsultationApiItem[];
}

interface CaseApiItem {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
}

interface CasesApiResponse {
  data?: CaseApiItem[];
}

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [consultationsResponse, casesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/consultations/my-consultations`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/api/cases/my-cases`, {
            credentials: "include",
          }),
        ]);

        if (!consultationsResponse.ok)
          throw new Error("Failed to fetch appointments");
        if (!casesResponse.ok) throw new Error("Failed to fetch cases");

        const consultationsData =
          (await consultationsResponse.json()) as ConsultationsApiResponse;
        const casesData = (await casesResponse.json()) as CasesApiResponse;

        const consultations = consultationsData.consultations ?? [];
        const normalizedAppointments = consultations.map((item) => ({
          id: item._id ?? item.id,
          date: item.date ?? "",
          time: item.time ?? "",
          status: item.status ?? "scheduled",
          lawyerName: item.lawyerId?.name,
        })) as AppointmentSummary[];

        const normalizedCases = (casesData.data ?? []).map((item) => ({
          id: item._id ?? item.id,
          title: item.title ?? "Untitled Case",
          description: item.description ?? "",
          status: item.status ?? "active",
        })) as CaseSummary[];

        const pendingAppointments = normalizedAppointments.filter(
          (item) =>
            item.status === "scheduled" || item.status === "rescheduled",
        ).length;
        const completedAppointments = normalizedAppointments.filter(
          (item) => item.status === "completed",
        ).length;

        const resolvedStatuses = new Set(["closed", "won", "lost"]);
        const resolvedCases = normalizedCases.filter((item) =>
          resolvedStatuses.has(item.status),
        ).length;
        const activeCases = normalizedCases.length - resolvedCases;

        setStats({
          totalAppointments: normalizedAppointments.length,
          pendingAppointments,
          completedAppointments,
          activeCases,
          resolvedCases,
        });
        setAppointments(normalizedAppointments);
        setCases(normalizedCases);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-10 items-end gap-1.5">
          <div className="bar-wave h-10 w-1.5 rounded-full bg-primary" />
          <div className="bar-wave bar-wave-delay-1 h-10 w-1.5 rounded-full bg-primary" />
          <div className="bar-wave bar-wave-delay-2 h-10 w-1.5 rounded-full bg-primary" />
        </div>
        <p className="text-sm text-on-surface-variant">Loading dashboard...</p>
      </div>
    );
  if (error)
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 p-4 text-sm text-error">
        Error: {error}
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Total Appointments"
            value={stats.totalAppointments}
          />
          <StatsCard label="Pending" value={stats.pendingAppointments} />
          <StatsCard label="Active Cases" value={stats.activeCases} />
          <StatsCard label="Resolved Cases" value={stats.resolvedCases} />
        </div>
      )}

      {/* Appointments */}
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-on-surface sm:text-xl">
          Upcoming Appointments
        </h3>
        {appointments.length === 0 ? (
          <p className="text-on-surface-variant">No appointments booked yet.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="rounded-lg border border-outline-variant bg-surface-container p-4"
              >
                <p className="font-semibold text-on-surface">
                  {apt.date} at {apt.time}
                </p>
                <p className="text-sm text-on-surface-variant">
                  Lawyer: {apt.lawyerName || "Assigned lawyer"}
                </p>
                <span className="mt-2 inline-block rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cases */}
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-on-surface sm:text-xl">
          My Cases
        </h3>
        {cases.length === 0 ? (
          <p className="text-on-surface-variant">No cases yet.</p>
        ) : (
          <div className="space-y-3">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="rounded-lg border border-outline-variant bg-surface-container p-4"
              >
                <p className="font-semibold text-on-surface">
                  {caseItem.title}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {caseItem.description}
                </p>
                <span className="mt-2 inline-block rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  {caseItem.status}
                </span>
              </div>
            ))}
          </div>
        )}
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
