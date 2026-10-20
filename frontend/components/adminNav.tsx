import {
  Briefcase,
  Calendar,
  FileText,
  History,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Scale,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import type { SidebarItem } from "../types/dashboard";
import { canOpenAdminArea } from "../lib/access";
import type { AuthUser } from "../lib/auth";

export interface AdminNavItem extends SidebarItem {
  // One line for the staff home tiles
  description: string;
}

const icon = (Icon: typeof LayoutDashboard) => <Icon className="h-4.5 w-4.5" />;

// The admin pages, in sidebar order. Which ones a user sees comes from
// lib/access.ts ADMIN_AREA_PERMS (Team and Roles are super-admin only).
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/dashboard/admin", label: "Dashboard", icon: icon(LayoutDashboard), description: "Firm-wide figures at a glance" },
  { href: "/dashboard/admin/appointments", label: "Appointments", icon: icon(Calendar), description: "Every lawyer's consultations" },
  { href: "/dashboard/admin/messages", label: "Messages", icon: icon(MessageSquare), description: "The contact-form inbox" },
  { href: "/dashboard/admin/cases", label: "Cases", icon: icon(Briefcase), description: "All cases across the firm" },
  { href: "/dashboard/admin/lawyers", label: "Lawyers", icon: icon(Scale), description: "Lawyer accounts and public order" },
  { href: "/dashboard/admin/users", label: "Users", icon: icon(Users), description: "Client accounts" },
  { href: "/dashboard/admin/blogs", label: "Blogs", icon: icon(Newspaper), description: "Write and publish blog posts" },
  { href: "/dashboard/admin/content", label: "Content", icon: icon(FileText), description: "Text and images on the public site" },
  { href: "/dashboard/admin/audit-logs", label: "Audit Logs", icon: icon(History), description: "Who did what, and when" },
  { href: "/dashboard/admin/team", label: "Team", icon: icon(UserCog), description: "Staff accounts" },
  { href: "/dashboard/admin/roles", label: "Roles", icon: icon(KeyRound), description: "What each staff role can do" },
];

export const SETTINGS_NAV_ITEM: SidebarItem = {
  href: "/dashboard/admin/settings",
  label: "Settings",
  icon: icon(Settings),
};

// Admin pages this user may open (UI hint only; the backend enforces)
export const adminNavFor = (user: AuthUser | null) =>
  ADMIN_NAV_ITEMS.filter((item) => canOpenAdminArea(user, item.href));
