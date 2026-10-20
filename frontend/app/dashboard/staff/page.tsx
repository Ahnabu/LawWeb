"use client";

import Link from "next/link";
import { ArrowRight, ShieldOff } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { adminNavFor } from "../../../components/adminNav";

// Staff home: one tile per area the staff member's role opens (the same
// pages as the sidebar). Phase 3 adds "Lawyers you assist" here.
export default function StaffDashboardPage() {
  const { user } = useAuth();
  const areas = adminNavFor(user);
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

      {areas.length === 0 ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-on-surface-variant" aria-hidden="true" />
          <p className="mt-3 text-sm text-on-surface">
            Your account doesn&apos;t have any access yet. Ask the firm administrator.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
