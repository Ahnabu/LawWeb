"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  UserCircle2,
  X,
} from "lucide-react";
import { navLinks } from "../lib/data";
import { useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "./AuthProvider";

const roleDashboardPath = {
  admin: "/dashboard/admin",
  lawyer: "/dashboard/lawyer",
  client: "/dashboard/client",
} as const;

export function Navbar() {
  const { t } = useLanguage();
  const { user, status, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const dashboardHref = user ? roleDashboardPath[user.role] : "/login";

  const initials = useMemo(() => {
    if (!user?.name) {
      return "";
    }

    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [status]);

  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-17 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-lg bg-secondary/10 text-secondary ring-1 ring-secondary/20">
            ⚖️
          </span>
          <span className="text-base font-semibold tracking-wide text-on-surface sm:text-lg">
            Islam & Associates
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-on-surface-variant transition hover:text-secondary"
            >
              {t(link.labelKey) ?? link.fallback}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:gap-3 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className="inline-flex items-center gap-3 rounded-full border border-outline-variant bg-surface px-2 py-1.5 pr-3 text-left shadow-sm transition hover:border-secondary"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
              >
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary/15 text-sm font-semibold text-secondary ring-1 ring-secondary/20">
                  {initials || <UserRound className="h-5 w-5" />}
                </span>
                <ChevronDown className="h-4 w-4 text-on-surface-variant" />
              </button>

              {isProfileMenuOpen ? (
                <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-outline-variant bg-surface p-2 shadow-2xl">
                  <Link
                    href={dashboardHref}
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await logout();
                      window.location.href = "/";
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              {t("common.login")}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface-variant transition hover:border-secondary hover:text-secondary md:hidden"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-haspopup="menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-outline-variant bg-surface/98 px-3 py-3 shadow-2xl shadow-slate-900/10 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-h-[calc(100dvh-6.5rem)] max-w-7xl flex-col gap-1 overflow-y-auto pb-24">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
              >
                {t(link.labelKey) ?? link.fallback}
              </Link>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            {user ? (
              <div className="mt-3 rounded-2xl border border-outline-variant bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary ring-1 ring-secondary/20">
                    {initials || <UserRound className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Link
                    href={dashboardHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:border-secondary hover:text-secondary"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMobileMenuOpen(false);
                      await logout();
                      window.location.href = "/";
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:border-secondary hover:text-secondary"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90"
              >
                {t("common.login")}
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
