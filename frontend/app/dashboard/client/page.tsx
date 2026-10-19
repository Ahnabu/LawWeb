"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";
import { DashboardStats } from "../../../types/dashboard";
import { apiFetch } from "../../../lib/http";
import { richTextToPlain } from "../../../lib/richText";

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
  isArchived: boolean;
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
  isArchived?: boolean;
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
          apiFetch(`${API_BASE_URL}/api/consultations/my-consultations`, {
            credentials: "include",
          }),
          apiFetch(`${API_BASE_URL}/api/cases/my-cases`, {
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
          isArchived: item.isArchived === true,
        })) as CaseSummary[];

        const pendingAppointments = normalizedAppointments.filter(
          (item) =>
            item.status === "scheduled" || item.status === "rescheduled",
        ).length;
        const completedAppointments = normalizedAppointments.filter(
          (item) => item.status === "completed",
        ).length;

        const resolvedStatuses = new Set(["closed", "won", "lost"]);
        // Archived cases are no longer being worked on, so they count as resolved
        const resolvedCases = normalizedCases.filter((item) =>
          item.isArchived || resolvedStatuses.has(item.status),
        ).length;
        const activeCases = normalizedCases.length - resolvedCases;

        setStats({
          totalAppointments: normalizedAppointments.length,
          pendingAppointments,
          completedAppointments,
          activeCases,
          resolvedCases,
        });
        // Only future, still-active bookings belong under "Upcoming", soonest first
        const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
        setAppointments(
          normalizedAppointments
            .filter(
              (item) =>
                (item.status === "scheduled" || item.status === "rescheduled") &&
                item.date.slice(0, 10) >= todayKey,
            )
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
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
          <div className="bar-wave h-10 w-1.5 rounded-full bg-secondary" />
          <div className="bar-wave bar-wave-delay-1 h-10 w-1.5 rounded-full bg-secondary" />
          <div className="bar-wave bar-wave-delay-2 h-10 w-1.5 rounded-full bg-secondary" />
        </div>
        <p className="text-sm text-on-surface-variant">Loading dashboard...</p>
      </div>
    );
  if (error)
    return (
      <div className="notice notice-error">
        Error: {error}
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gold-ink">Welcome back</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-heading">
            Your Legal Overview
          </h2>
        </div>
        <Link
          href="/appointment"
          className="btn btn-primary"
        >
          Book Appointment
        </Link>
      </div>

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
        <h3 className="mb-3 font-display text-lg font-semibold text-heading sm:text-xl">
          Upcoming Appointments
        </h3>
        {appointments.length === 0 ? (
          <p className="text-on-surface-variant">No upcoming appointments.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="card p-4"
              >
                <p className="font-semibold text-on-surface">
                  {new Date(apt.date).toLocaleDateString("en-BD", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}{" "}
                  at {apt.time}
                </p>
                <p className="text-sm text-on-surface-variant">
                  Lawyer: {apt.lawyerName || "Assigned lawyer"}
                </p>
                <span className="chip mt-2">
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cases */}
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-heading sm:text-xl">
          My Cases
        </h3>
        {cases.length === 0 ? (
          <p className="text-on-surface-variant">No cases yet.</p>
        ) : (
          <div className="space-y-3">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="card p-4"
              >
                <p className="font-semibold text-on-surface">
                  {caseItem.title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                  {richTextToPlain(caseItem.description, 220)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="chip">
                    {caseItem.status}
                  </span>
                  {caseItem.isArchived && (
                    <span className="chip">
                      Archived
                    </span>
                  )}
                </div>
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
    <div className="card p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-heading">
        {value}
      </p>
    </div>
  );
}
