"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { canOpenWith } from "../lib/access";

interface PermissionGateProps {
  children: React.ReactNode;
  // Any of these opens the page; null = super-admin only; [] = every staff member
  anyOf: readonly string[] | null;
}

// Wraps an admin page. Without access it shows a card instead of redirecting
// (redirect loops between dashboards were a past bug). UI hint only; the API
// refuses the same requests.
export function PermissionGate({ children, anyOf }: PermissionGateProps) {
  const { user } = useAuth();
  if (canOpenWith(user, anyOf)) return <>{children}</>;
  return <NoAccessCard />;
}

// The card itself, also used by the lawyer workspace pages
export function NoAccessCard({ hint = "Ask the firm administrator if you need it." }: { hint?: string }) {
  const { user } = useAuth();
  const home = user?.role === "staff" ? "/dashboard/staff" : "/dashboard";
  return (
    <div className="mx-auto max-w-md py-16">
      <div className="card p-6 text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-on-surface-variant" aria-hidden="true" />
        <h2 className="mt-3 font-display text-lg font-semibold text-on-surface">
          You don&apos;t have access to this page
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {hint}
        </p>
        <Link href={home} className="btn btn-secondary mt-5">
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
