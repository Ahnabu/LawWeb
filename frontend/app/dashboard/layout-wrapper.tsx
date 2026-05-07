"use client";

import { useAuth } from "../../components/AuthProvider";
import { DashboardLayout } from "../../components/DashboardLayout";
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
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && user?.role !== role) {
      // Redirect to correct dashboard for their role
      router.push(`/dashboard/${user?.role}`);
    }
  }, [status, user, role, router]);

  if (status === "loading" || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-lg text-on-surface">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout role={role}>{children}</DashboardLayout>;
}
