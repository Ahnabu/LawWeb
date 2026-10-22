"use client";

import { useEffect, useState } from "react";
import { getWorkspaceOverview, type WorkspaceLawyerId, type WorkspaceOverview as Overview } from "../../lib/workspace";
import { useWorkspace } from "./useWorkspace";

// The workspace home. Each part (appointments, cases) comes back only when the
// actor may see it, so an assistant with scheduling access sees no case numbers.
export function WorkspaceOverview({ lawyerId }: { lawyerId: WorkspaceLawyerId }) {
  const workspace = useWorkspace(lawyerId);
  const [stats, setStats] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getWorkspaceOverview(lawyerId)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "An error occurred"))
      .finally(() => setIsLoading(false));
  }, [lawyerId]);

  if (isLoading)
    return (
      <div className="text-center text-on-surface">Loading dashboard...</div>
    );
  if (error) return <div className="text-error">Error: {error}</div>;
  if (!stats) return null;

  const { appointments, cases } = stats;
  const owner = workspace.isOwn ? "your" : `${stats.lawyer.name}'s`;

  return (
    <div className="space-y-8">
      {!workspace.isOwn && (
        <header className="space-y-1">
          <h3 className="font-display text-2xl font-semibold text-heading">{stats.lawyer.name}</h3>
          <p className="text-sm text-on-surface-variant">
            You&apos;re working as {stats.lawyer.name}&apos;s assistant. Clients always see their name, not yours.
          </p>
        </header>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {appointments && (
          <>
            <StatsCard label="Pending Appointments" value={appointments.pending} />
            <StatsCard label="Completed" value={appointments.completed} />
          </>
        )}
        {cases && (
          <>
            <StatsCard label="Active Cases" value={cases.active} />
            <StatsCard label="Resolved Cases" value={cases.resolved} />
          </>
        )}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {appointments && (
          <div className="card p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold text-heading">
              Appointment overview
            </h3>
            <p className="mt-3 text-sm text-on-surface-variant">
              Keep an eye on {owner} consultation load and see what requires follow-up.
            </p>
            <div className="mt-6 space-y-3">
              <SummaryRow label="Pending appointments" value={appointments.pending} />
              <SummaryRow label="Completed appointments" value={appointments.completed} />
            </div>
          </div>
        )}

        {cases && (
          <div className="card p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold text-heading">
              Case workload
            </h3>
            <p className="mt-3 text-sm text-on-surface-variant">
              Review the balance between active case work and resolved matters.
            </p>
            <div className="mt-6 space-y-3">
              <SummaryRow label="Active cases" value={cases.active} />
              <SummaryRow label="Resolved cases" value={cases.resolved} />
            </div>
          </div>
        )}
      </section>

      {appointments && appointments.upcoming.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold text-heading">Coming up</h3>
          <ul className="mt-4 divide-y divide-outline-variant">
            {appointments.upcoming.map((apt) => (
              <li key={apt._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-on-surface">{apt.clientId?.name || "Client"}</span>
                  <span className="text-on-surface-variant"> · {apt.subject}</span>
                </span>
                <span className="whitespace-nowrap text-on-surface-variant">
                  {new Date(apt.date).toLocaleDateString("en-BD", { day: "2-digit", month: "short", timeZone: "UTC" })} · {apt.time}
                  {!apt.lawyerConfirmed && <span className="ml-2 text-xs font-semibold text-gold-ink">Not confirmed</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold text-heading">
          Next steps
        </h3>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          Use the sidebar links to jump directly into {owner} appointments and case listings. Prioritize pending consultations and update case records as soon as hearings are scheduled.
        </p>
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

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel flex items-center justify-between p-4">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}
