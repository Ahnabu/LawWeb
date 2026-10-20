"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  PanelLeftClose,
  LayoutDashboard,
  FileText,
  Briefcase,
  Calendar,
  Settings,
  Home,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { SidebarItem, type DashboardRole } from "../types/dashboard";
import { SETTINGS_NAV_ITEM, adminNavFor } from "./adminNav";
import type { AuthUser } from "../lib/auth";

interface DashboardLayoutProps {
  children: ReactNode;
  role: DashboardRole;
}

const getSidebarItems = (
  role: DashboardRole,
  user: AuthUser | null,
): SidebarItem[] => {
  // Staff see the same sidebar in every area: their home, the admin pages
  // their role opens, then Settings
  if (user?.role === "staff") {
    return [
      { href: "/dashboard/staff", label: "Home", icon: <Home className="h-4.5 w-4.5" /> },
      ...adminNavFor(user),
      SETTINGS_NAV_ITEM,
    ];
  }
  // Admin pages are filtered by access (the super-admin sees all, plus Team and Roles)
  if (role === "admin") return [...adminNavFor(user), SETTINGS_NAV_ITEM];

  const baseItems: Record<string, SidebarItem[]> = {
    client: [
      {
        href: "/dashboard/client",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/client/appointments",
        label: "Appointments",
        icon: <Calendar className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/client/cases",
        label: "My Cases",
        icon: <Briefcase className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/client/track-case",
        label: "Track Case",
        icon: <FileText className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/client/profile",
        label: "Profile",
        icon: <Settings className="h-4.5 w-4.5" />,
      },
    ],
    lawyer: [
      {
        href: "/dashboard/lawyer",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/lawyer/appointments",
        label: "Appointments",
        icon: <Calendar className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/lawyer/cases",
        label: "Cases",
        icon: <Briefcase className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/lawyer/availability",
        label: "Availability",
        icon: <FileText className="h-4.5 w-4.5" />,
      },
      {
        href: "/dashboard/lawyer/profile",
        label: "Profile",
        icon: <Settings className="h-4.5 w-4.5" />,
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
  const { theme, toggleTheme } = useTheme();
  const sidebarItems = getSidebarItems(role, user);

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
        } shrink-0 transform border-r border-outline-variant bg-surface-container shadow-[inset_-1px_0_0_var(--highlight)] transition-all duration-200 ease-out ${
          isSidebarOpen
            ? "w-64 translate-x-0"
            : isMobile
              ? "w-64 -translate-x-full"
              : "w-0 overflow-hidden border-0 -translate-x-full"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          {/* Logo + collapse button */}
          <div className="flex h-15 items-center justify-between border-b border-outline-variant px-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={closeSidebarOnMobile}>
              <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-raised">
                <Image
                  src="/logo.jpg"
                  alt="Islam and Associates International Law Offices"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="truncate font-display text-sm font-bold leading-tight text-heading">
                Islam & Associates
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn btn-ghost btn-icon ml-2 shrink-0"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav aria-label="Dashboard" className="flex-1 space-y-1 overflow-y-auto p-3">
            {sidebarItems.map((item) => {
              // Sub-pages (e.g. /dashboard/admin/content/about) keep their section active;
              // the role home (/dashboard/admin) only matches exactly
              const isActive =
                pathname === item.href ||
                (item.href.split("/").length > 3 && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebarOnMobile}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors duration-150 ${
                    isActive
                      ? "border-outline-variant bg-surface-raised font-semibold text-on-surface shadow-[inset_0_1px_0_var(--highlight),0_1px_2px_rgb(16_24_40/0.08)]"
                      : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  {isActive && (
                    <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-secondary" />
                  )}
                  <span className={isActive ? "text-gold-ink" : ""}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-outline-variant p-3">
            <div className="mb-2 px-1">
              <p className="text-xs text-on-surface-variant">Logged in as</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-on-surface">
                {user?.name || user?.email}
              </p>
              <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost btn-block justify-start px-3 hover:text-error"
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
        <div className="site-header shrink-0 px-4 sm:px-6">
          <div className="flex h-15 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="btn btn-secondary btn-icon"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <h3 className="font-display text-lg font-semibold text-heading">
                Dashboard
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-secondary btn-icon text-on-surface-variant"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4.5 w-4.5" />
                ) : (
                  <Moon className="h-4.5 w-4.5" />
                )}
              </button>
              <Link
                href="/"
                className="btn btn-secondary btn-icon text-on-surface-variant"
                aria-label="Go to Home"
                title="Go to Home"
              >
                <Home className="h-4.5 w-4.5" />
              </Link>
            </div>
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
          className="fixed inset-0 z-30 bg-[rgb(10_22_40/0.45)]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
