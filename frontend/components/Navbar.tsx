"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
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
  staff: "/dashboard/staff",
} as const;

const menuItemClass =
  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface";

export function Navbar() {
  const { t, localePath } = useLanguage();
  const { user, status, logout } = useAuth();
  const pathname = usePathname() ?? "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const dashboardHref = user ? roleDashboardPath[user.role] : "/login";

  // Current section, ignoring the /bn prefix
  const basePath = pathname.replace(/^\/bn(?=\/|$)/, "") || "/";
  const isCurrent = (href: string) =>
    basePath === href || basePath.startsWith(`${href}/`);

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

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
    window.location.href = localePath("/");
  };

  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-17 sm:px-6 lg:px-8">
        <Link
          href={localePath("/")}
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
        >
          <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-raised sm:h-10 sm:w-10">
            <Image
              src="/logo.jpg"
              alt="Islam and Associates International Law Offices"
              width={44}
              height={44}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="truncate font-display text-[0.95rem] font-bold text-heading sm:text-lg">
            {t("site.firmName")}
          </span>
        </Link>

        {/* Tighter links between lg and xl so seven links and the firm name fit at 1024px */}
        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex xl:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={localePath(link.href)}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className="nav-link px-2 xl:px-3"
            >
              {t(link.labelKey) ?? link.fallback}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle />
            <ThemeToggle />
            {user ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                  className="monogram h-10 w-10 text-xs"
                  aria-label={t("nav.openProfileMenu")}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  {initials || <UserRound className="h-4 w-4" />}
                </button>

                {isProfileMenuOpen ? (
                  <div className="card absolute right-0 mt-2 w-56 p-1.5 shadow-xl">
                    <Link
                      href={dashboardHref}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t("nav.dashboard")}
                    </Link>
                    <hr className="rule mx-2 my-1" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={menuItemClass}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">
                {t("common.login")}
              </Link>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-icon lg:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
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
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-outline-variant bg-surface-raised lg:hidden">
          <nav
            aria-label="Main"
            className="mx-auto flex max-h-[calc(100dvh-3.5rem)] max-w-7xl flex-col overflow-y-auto px-4 pb-6 pt-2 sm:max-h-[calc(100dvh-4.25rem)] sm:px-6"
          >
            {navLinks.map((link) => {
              const current = isCurrent(link.href);
              return (
                <Link
                  key={link.href}
                  href={localePath(link.href)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-12 items-center border-b border-outline-variant py-3 pl-3 text-base transition-colors ${
                    current
                      ? "border-l-2 border-l-secondary font-semibold text-on-surface"
                      : "border-l-2 border-l-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t(link.labelKey) ?? link.fallback}
                </Link>
              );
            })}

            <div className="mt-4 flex items-center gap-2 md:hidden">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            {user ? (
              <div className="mt-4 md:hidden">
                <div className="flex items-center gap-3">
                  <span className="monogram h-10 w-10 text-xs">
                    {initials || <UserRound className="h-4 w-4" />}
                  </span>
                  <p className="min-w-0 truncate text-sm font-semibold text-on-surface">
                    {user.email}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={dashboardHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn btn-secondary"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-ghost"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-primary btn-block mt-4 md:hidden"
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
