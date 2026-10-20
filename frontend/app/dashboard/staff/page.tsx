"use client";

import Link from "next/link";
import { ArrowRight, ShieldOff } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { adminNavFor } from "../../../components/adminNav";
import { workspaceHomeFor } from "../../../components/lawyer-workspace/workspacePages";
import { summarizePermissions } from "../../../lib/delegation";
import { UserAvatar } from "../admin/users/_components/userActions";

// Staff home: the lawyers they assist, then one tile per area their firm role
// opens (the same pages as the sidebar).
export default function StaffDashboardPage() {
  const { user } = useAuth();
  const areas = adminNavFor(user);
  const lawyers = user?.access?.delegations ?? [];
  const roleName = user?.access?.roleName;
  const firstName = user?.name?.split(" ")[0] || user?.name;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Welcome, {firstName}
        </h3>
        <p className="text-sm text-on-surface-variant">
          {roleName ? (
            <>
              Your role: <span className="font-semibold text-on-surface">{roleName}</span>
            </>
          ) : (
            "You don't have a role yet."
          )}
        </p>
      </header>

      {lawyers.length > 0 && (
        <section aria-labelledby="assist-heading" className="space-y-3">
          <h4 id="assist-heading" className="font-display text-lg font-semibold text-heading">Lawyers you assist</h4>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lawyers.map((lawyer) => (
              <li key={lawyer.lawyerId}>
                <Link
                  href={workspaceHomeFor(user, lawyer.lawyerId)}
                  className="card group flex h-full items-center gap-3 p-4 transition-colors hover:border-secondary"
                >
                  <UserAvatar name={lawyer.lawyerName ?? ""} imageUrl={lawyer.lawyerPhoto ?? undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-on-surface">{lawyer.lawyerName}</span>
                    <span className="mt-0.5 block text-sm text-on-surface-variant">{summarizePermissions(lawyer.permissions)}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {areas.length === 0 && lawyers.length === 0 ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-on-surface-variant" aria-hidden="true" />
          <p className="mt-3 text-sm text-on-surface">
            Your account doesn&apos;t have any access yet. Ask the firm administrator.
          </p>
        </div>
      ) : areas.length > 0 && (
        <section aria-labelledby="areas-heading" className="space-y-3">
        {lawyers.length > 0 && (
          <h4 id="areas-heading" className="font-display text-lg font-semibold text-heading">Firm areas</h4>
        )}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={area.href}>
              <Link
                href={area.href}
                className="card group flex h-full items-start gap-3 p-4 transition-colors hover:border-secondary"
              >
                <span className="mt-0.5 text-gold-ink">{area.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-on-surface">{area.label}</span>
                  <span className="mt-0.5 block text-sm text-on-surface-variant">{area.description}</span>
                </span>
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
        </section>
      )}
    </div>
  );
}

