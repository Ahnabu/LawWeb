"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";
import { apiFetch } from "../../../lib/http";

interface AdminStats {
  totalCases: number;
  activeCases: number;
  // Total/active exclude archived cases; archived ones are counted here
  archivedCases?: number;
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
        const response = await apiFetch(`${API_BASE_URL}/api/admin/stats`, {
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
      <div className="space-y-6" aria-busy="true">
        <div className="card h-24 bg-surface-container" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card h-64 bg-surface-container" />
          <div className="card h-64 bg-surface-container" />
        </div>
      </div>
    );
  }
  if (error) return <p className="notice notice-error" role="alert">Error: {error}</p>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Key figures: one quiet ledger strip instead of a wall of cards */}
      {stats && (
        <dl className="card grid grid-cols-2 gap-px overflow-hidden bg-outline-variant lg:grid-cols-4">
          <StatsCard label="Total Cases" value={stats.totalCases} />
          <StatsCard label="Active Cases" value={stats.activeCases} />
          <StatsCard label="Total Lawyers" value={stats.totalLawyers} />
          <StatsCard label="Total Clients" value={stats.totalClients} />
        </dl>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Today&apos;s snapshot
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Review the current platform activity and identify immediate follow-up items.
          </p>
          <dl className="mt-4 divide-y divide-outline-variant">
            <SummaryRow
              label="Consultations today"
              value={stats.todayConsultations}
            />
            <SummaryRow label="Active cases" value={stats.activeCases} />
            <SummaryRow label="Archived cases" value={stats.archivedCases ?? 0} />
            <SummaryRow label="Verified lawyers" value={stats.totalLawyers} />
            <SummaryRow label="Registered clients" value={stats.totalClients} />
          </dl>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Recommended actions
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Focus on case backlog, monitor consultation volume, and verify any new lawyer accounts.
          </p>
          <ul className="mt-4 divide-y divide-outline-variant text-sm text-on-surface">
            <li className="flex gap-3 py-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />Review new client registrations and verify any flagged accounts.</li>
            <li className="flex gap-3 py-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />Check active cases for upcoming court dates and next steps.</li>
            <li className="flex gap-3 py-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />Use the dashboard sidebar to manage lawyers, users, and cases.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-raised px-5 py-4">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-bold text-on-surface tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="font-semibold text-on-surface tabular-nums">{value}</dd>
    </div>
  );
}
