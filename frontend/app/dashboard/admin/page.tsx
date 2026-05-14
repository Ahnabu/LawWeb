"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";

interface AdminStats {
  totalCases: number;
  activeCases: number;
  totalLawyers: number;
  totalClients: number;
  todayConsultations: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`stat-skeleton-${index}`}
              className="h-24 animate-pulse rounded-lg border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-full animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
    );
  }
  if (error) return <div className="text-error">Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total Cases" value={stats.totalCases} />
          <StatsCard label="Active Cases" value={stats.activeCases} />
          <StatsCard label="Total Lawyers" value={stats.totalLawyers} />
          <StatsCard label="Total Clients" value={stats.totalClients} />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Today&apos;s snapshot
          </h3>
          <p className="mt-3 text-sm text-on-surface-variant">
            Review the current platform activity and identify immediate follow-up items.
          </p>
          <div className="mt-6 space-y-3">
            <SummaryRow
              label="Consultations today"
              value={stats.todayConsultations}
            />
            <SummaryRow label="Active cases" value={stats.activeCases} />
            <SummaryRow label="Verified lawyers" value={stats.totalLawyers} />
            <SummaryRow label="Registered clients" value={stats.totalClients} />
          </div>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Recommended actions
          </h3>
          <p className="mt-3 text-sm text-on-surface-variant">
            Focus on case backlog, monitor consultation volume, and verify any new lawyer accounts.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-on-surface-variant">
            <li className="rounded-xl bg-surface p-4">Review new client registrations and verify any flagged accounts.</li>
            <li className="rounded-xl bg-surface p-4">Check active cases for upcoming court dates and next steps.</li>
            <li className="rounded-xl bg-surface p-4">Use the dashboard sidebar to manage lawyers, users, and cases.</li>
          </ul>
        </div>
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
