"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Settings,
  Home,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { SidebarItem } from "../types/dashboard";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "client" | "lawyer" | "admin";
}

const getSidebarItems = (
  role: "client" | "lawyer" | "admin",
): SidebarItem[] => {
  const baseItems: Record<string, SidebarItem[]> = {
    client: [
      {
        href: "/dashboard/client",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        href: "/dashboard/client/appointments",
        label: "Appointments",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        href: "/dashboard/client/cases",
        label: "My Cases",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        href: "/dashboard/client/profile",
        label: "Profile",
        icon: <Settings className="h-5 w-5" />,
      },
    ],
    lawyer: [
      {
        href: "/dashboard/lawyer",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        href: "/dashboard/lawyer/appointments",
        label: "Appointments",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        href: "/dashboard/lawyer/cases",
        label: "Cases",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        href: "/dashboard/lawyer/availability",
        label: "Availability",
        icon: <Settings className="h-5 w-5" />,
      },
      {
        href: "/dashboard/lawyer/profile",
        label: "Profile",
        icon: <Settings className="h-5 w-5" />,
      },
    ],
    admin: [
      {
        href: "/dashboard/admin",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/appointments",
        label: "Appointments",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/cases",
        label: "Cases",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/lawyers",
        label: "Lawyers",
        icon: <Settings className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/users",
        label: "Users",
        icon: <Settings className="h-5 w-5" />,
      },
    ],
  };
  return baseItems[role] || [];
};

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const sidebarItems = getSidebarItems(role);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="dashboard-root flex h-screen bg-surface">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-outline-variant bg-surface-container transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-outline-variant p-4 sm:p-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-xl">
                ⚖️
              </span>
              <span className="hidden font-semibold text-on-surface sm:inline">
                Islam & Associates
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4 sm:p-6">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-outline-variant p-4 sm:p-6">
            <div className="mb-4">
              <p className="text-xs text-on-surface-variant">Logged in as</p>
              <p className="mt-1 truncate text-sm font-semibold text-on-surface">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <div className="border-b border-outline-variant bg-surface p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg border border-outline-variant p-2 text-on-surface md:hidden"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
              Dashboard
            </h2>

            <Link
              href="/"
              className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:text-primary"
            >
              <Home className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
