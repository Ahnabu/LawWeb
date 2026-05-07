"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  PanelLeftClose,
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Calendar,
  Settings,
  Home,
  Scale,
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
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        href: "/dashboard/client/cases",
        label: "My Cases",
        icon: <Briefcase className="h-5 w-5" />,
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
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        href: "/dashboard/lawyer/cases",
        label: "Cases",
        icon: <Briefcase className="h-5 w-5" />,
      },
      {
        href: "/dashboard/lawyer/availability",
        label: "Availability",
        icon: <FileText className="h-5 w-5" />,
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
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/cases",
        label: "Cases",
        icon: <Briefcase className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/lawyers",
        label: "Lawyers",
        icon: <Scale className="h-5 w-5" />,
      },
      {
        href: "/dashboard/admin/users",
        label: "Users",
        icon: <Users className="h-5 w-5" />,
      },
    ],
  };
  return baseItems[role] || [];
};

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const sidebarItems = getSidebarItems(role);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const closeSidebarOnMobile = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <div className="dashboard-root flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside
        className={`${
          isMobile ? "fixed inset-y-0 left-0 z-40" : "relative z-10"
        } shrink-0 transform border-r border-outline-variant bg-surface-container transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? "w-64 translate-x-0"
            : isMobile
              ? "w-64 -translate-x-full"
              : "w-0 overflow-hidden border-0 -translate-x-full"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          {/* Logo + collapse button */}
          <div className="flex items-center justify-between border-b border-outline-variant px-3 py-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={closeSidebarOnMobile}>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-lg">
                ⚖️
              </span>
              <span className="truncate font-semibold text-on-surface text-sm leading-tight">
                Islam & Associates
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="ml-2 shrink-0 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface hover:text-on-surface transition"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebarOnMobile}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-outline-variant p-3">
            <div className="mb-3 px-1">
              <p className="text-xs text-on-surface-variant">Logged in as</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-on-surface">
                {user?.name || user?.email}
              </p>
              <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface hover:text-error transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="shrink-0 border-b border-outline-variant bg-surface px-4 py-2.5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="rounded-lg border border-outline-variant p-2 text-on-surface hover:bg-surface-container transition"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <h3 className="font-display text-lg font-semibold text-on-surface sm:text-xl">
                Dashboard
              </h3>
            </div>

            <Link
              href="/"
              className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:text-primary transition"
              title="Go to Home"
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
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
