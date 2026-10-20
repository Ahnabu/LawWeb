import { Briefcase, Calendar, Clock, LayoutDashboard, UserRound } from "lucide-react";
import { canAny } from "../../lib/access";
import type { AuthUser } from "../../lib/auth";
import type { SidebarItem } from "../../types/dashboard";

// The pages of a lawyer workspace as a staff member sees them
// (/dashboard/staff/lawyers/<id>/...), and the permissions that open each one
// (any of). The same list gates the pages and builds the sidebar.
export interface WorkspacePage {
  path: "" | "/appointments" | "/cases" | "/availability" | "/profile";
  label: string;
  Icon: typeof LayoutDashboard;
  anyOf: readonly string[];
}

export const WORKSPACE_PAGES: readonly WorkspacePage[] = [
  { path: "", label: "Overview", Icon: LayoutDashboard, anyOf: ["cases.view", "appointments.view"] },
  { path: "/appointments", label: "Appointments", Icon: Calendar, anyOf: ["appointments.view"] },
  { path: "/cases", label: "Cases", Icon: Briefcase, anyOf: ["cases.view"] },
  { path: "/availability", label: "Availability", Icon: Clock, anyOf: ["availability.manage"] },
  { path: "/profile", label: "Public Profile", Icon: UserRound, anyOf: ["profile.edit"] },
];

export const staffWorkspaceBase = (lawyerId: string) => `/dashboard/staff/lawyers/${lawyerId}`;

// "/dashboard/staff/lawyers/<id>/cases/<caseId>" -> { lawyerId, subPath: "/cases/<caseId>" }
export function parseStaffWorkspacePath(pathname: string) {
  const match = pathname.match(/^\/dashboard\/staff\/lawyers\/([^/]+)(\/.*)?$/);
  return match ? { lawyerId: match[1], subPath: match[2] ?? "" } : null;
}

// The page a sub-path belongs to (case details belong to Cases)
export const workspacePageFor = (subPath: string) =>
  subPath === "" ? WORKSPACE_PAGES[0] : WORKSPACE_PAGES.find((p) => p.path && (subPath === p.path || subPath.startsWith(`${p.path}/`)));

export const workspacePagesFor = (user: AuthUser | null | undefined, lawyerId: string) =>
  WORKSPACE_PAGES.filter((page) => canAny(user, page.anyOf, lawyerId));

// Where a link to this lawyer's workspace should land: the first page they may open
export function workspaceHomeFor(user: AuthUser | null | undefined, lawyerId: string): string {
  const first = workspacePagesFor(user, lawyerId)[0];
  return `${staffWorkspaceBase(lawyerId)}${first?.path ?? ""}`;
}

export const workspaceSidebarItems = (user: AuthUser | null | undefined, lawyerId: string): (SidebarItem & { exact?: boolean })[] =>
  workspacePagesFor(user, lawyerId).map((page) => ({
    href: `${staffWorkspaceBase(lawyerId)}${page.path}`,
    label: page.label,
    icon: <page.Icon className="h-4.5 w-4.5" />,
    // The overview must not light up on every sub-page
    exact: page.path === "",
  }));
