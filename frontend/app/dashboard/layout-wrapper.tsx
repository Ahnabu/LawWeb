"use client";

import { useAuth } from "../../components/AuthProvider";
import { DashboardLayout } from "../../components/DashboardLayout";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && user?.role !== role) {
      router.push(`/dashboard/${user?.role}`);
    }
  }, [status, user, role, router]);

  if (status === "loading" || !user) {
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
      {children}
      {user.passwordNeedsChange && (
        <ChangePasswordModal onSuccess={handlePasswordChanged} />
      )}
    </DashboardLayout>
  );
}
