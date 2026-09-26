"use client";

import { useAuth } from "../../components/AuthProvider";
import { DashboardLayout } from "../../components/DashboardLayout";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { usePathname, useRouter } from "next/navigation";
import { dashboardPathFor } from "../../lib/auth";
import { useEffect } from "react";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
  role: "client" | "lawyer" | "admin";
}

export default function DashboardLayoutWrapper({
  children,
  role,
}: DashboardLayoutWrapperProps) {
  const { user, status, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || `/dashboard/${role}`)}`);
    } else if (status === "authenticated" && user && user.role !== role) {
      // Wrong dashboard for this account: send it to its own. Logging out here
      // (the old behaviour) signed admins out right after a successful login
      // whenever a stale redirect pointed them at /dashboard/client.
      router.replace(dashboardPathFor(user.role));
    }
  }, [status, user, role, router, pathname]);

  if (status === "loading" || !user || user.role !== role) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-10 items-end gap-1.5">
            <div className="bar-wave h-10 w-1.5 rounded-full bg-primary" />
            <div className="bar-wave bar-wave-delay-1 h-10 w-1.5 rounded-full bg-primary" />
            <div className="bar-wave bar-wave-delay-2 h-10 w-1.5 rounded-full bg-primary" />
          </div>
          <p className="text-sm text-on-surface-variant tracking-wide">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handlePasswordChanged = async () => {
    await refreshSession();
  };

  return (
    <DashboardLayout role={role}>
      {/* The API refuses everything but auth calls until the password is changed */}
      {user.passwordNeedsChange ? (
        <ChangePasswordModal onSuccess={handlePasswordChanged} />
      ) : (
        children
      )}
    </DashboardLayout>
  );
}
