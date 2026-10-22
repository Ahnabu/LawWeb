"use client";

import { useAuth } from "../../components/AuthProvider";
import { DashboardLayout } from "../../components/DashboardLayout";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { PermissionGate } from "../../components/PermissionGate";
import { usePathname, useRouter } from "next/navigation";
import { dashboardPathFor, type AuthUser } from "../../lib/auth";
import { adminAreaPermsFor, can, canOpenAdminArea, hasAdminAreaAccess, isSuperAdmin } from "../../lib/access";
import type { DashboardRole } from "../../types/dashboard";
import { useEffect, useRef } from "react";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
  role: DashboardRole;
}

// Who may open each dashboard area. Staff use the admin pages their role
// allows; Settings ("my account") opens for every staff member.
function allows(area: DashboardRole, user: AuthUser, pathname: string): boolean {
  if (area === "admin") {
    return isSuperAdmin(user) || (user.role === "staff" && (hasAdminAreaAccess(user) || canOpenAdminArea(user, pathname)));
  }
  return user.role === area;
}

export default function DashboardLayoutWrapper({
  children,
  role,
}: DashboardLayoutWrapperProps) {
  const { user, status, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || `/dashboard/${role}`;
  const allowed = Boolean(user && allows(role, user, pathname));

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user && !allowed) {
      // Wrong dashboard for this account: send it to its own. Logging out here
      // (the old behaviour) signed admins out right after a successful login
      // whenever a stale redirect pointed them at /dashboard/client.
      router.replace(dashboardPathFor(user.role));
    }
  }, [status, user, allowed, router, pathname]);

  // A staff member's role can change while they are signed in; re-check it on
  // each navigation so the sidebar and pages follow on the next click
  const isStaff = user?.role === "staff";
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (isStaff) void refreshSession();
  }, [pathname, isStaff, refreshSession]);

  if (status === "loading" || !user || !allowed) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-10 items-end gap-1.5">
            <div className="bar-wave h-10 w-1.5 rounded-full bg-secondary" />
            <div className="bar-wave bar-wave-delay-1 h-10 w-1.5 rounded-full bg-secondary" />
            <div className="bar-wave bar-wave-delay-2 h-10 w-1.5 rounded-full bg-secondary" />
          </div>
          <p className="text-sm text-on-surface-variant">
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
      ) : role === "admin" ? (
        <AdminAreaGate user={user} pathname={pathname}>{children}</AdminAreaGate>
      ) : (
        children
      )}
    </DashboardLayout>
  );
}

// Each admin page needs the permissions in lib/access.ts ADMIN_AREA_PERMS.
// Staff without dashboard statistics have their own home instead of the overview.
function AdminAreaGate({ user, pathname, children }: { user: AuthUser; pathname: string; children: React.ReactNode }) {
  const router = useRouter();
  const toStaffHome = pathname === "/dashboard/admin" && user.role === "staff" && !can(user, "dashboard.stats");

  useEffect(() => {
    if (toStaffHome) router.replace("/dashboard/staff");
  }, [toStaffHome, router]);

  if (toStaffHome) return null;
  return <PermissionGate anyOf={adminAreaPermsFor(pathname) ?? null}>{children}</PermissionGate>;
}
