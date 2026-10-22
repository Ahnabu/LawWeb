// Mirrors backend/src/access for the UI. UI hint only; the backend enforces.
// Every button this hides is also refused by the API.
import type { AuthUser } from './auth'

// A lawyer this staff member assists. Only active lawyers are listed, and
// `permissions` is already expanded with implied ones.
export interface Delegation {
  lawyerId: string
  lawyerName?: string
  lawyerPhoto?: string | null
  permissions: string[]
}

// What /api/auth/profile (and login) return for the signed-in account. `firm`
// is already expanded with implied permissions, so no `implies` logic here.
export interface UserAccess {
  superAdmin: boolean
  firm: string[]
  /** Staff only: the firm role's name (null when they have no role yet) */
  roleName?: string | null
  delegations: Delegation[]
}

// Permissions a lawyer holds on their own records (backend LAWYER_SCOPED)
export const LAWYER_SCOPED: readonly string[] = [
  'cases.view', 'cases.create', 'cases.edit', 'cases.archive', 'cases.feature',
  'cases.finance.view', 'cases.finance.edit', 'cases.confidential.view', 'cases.confidential.edit',
  'appointments.view', 'appointments.manage', 'availability.manage', 'profile.edit',
]

type AccessUser = Pick<AuthUser, '_id' | 'role' | 'access'> | null | undefined

export function can(user: AccessUser, perm: string, lawyerId?: string): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.access?.superAdmin) return true
  if (user.role === 'lawyer') return LAWYER_SCOPED.includes(perm) && lawyerId === user._id
  if (user.role === 'staff') {
    if (user.access?.firm.includes(perm)) return true
    return Boolean(lawyerId && user.access?.delegations.some((d) => d.lawyerId === lawyerId && d.permissions.includes(perm)))
  }
  return false
}

export const canAny = (user: AccessUser, perms: readonly string[], lawyerId?: string) =>
  perms.some((perm) => can(user, perm, lawyerId))

export const isSuperAdmin = (user: AccessUser) => Boolean(user && (user.role === 'admin' || user.access?.superAdmin))

// Admin pages and the permissions that open them (any of). null = super-admin only;
// an empty list = every admin-area account (Settings is "my account").
export const ADMIN_AREA_PERMS: Record<string, readonly string[] | null> = {
  '/dashboard/admin': ['dashboard.stats'],
  '/dashboard/admin/appointments': ['appointments.view'],
  '/dashboard/admin/messages': ['messages.manage'],
  '/dashboard/admin/cases': ['cases.view'],
  '/dashboard/admin/lawyers': ['lawyers.view'],
  '/dashboard/admin/users': ['clients.view'],
  '/dashboard/admin/blogs': ['blogs.manage'],
  '/dashboard/admin/content': ['content.edit'],
  '/dashboard/admin/audit-logs': ['audit.view'],
  '/dashboard/admin/team': null,
  '/dashboard/admin/roles': null,
  '/dashboard/admin/settings': [],
}

// Permissions behind an admin page path (sub-pages use their section's entry)
export function adminAreaPermsFor(pathname: string): readonly string[] | null | undefined {
  if (pathname in ADMIN_AREA_PERMS) return ADMIN_AREA_PERMS[pathname]
  const section = Object.keys(ADMIN_AREA_PERMS)
    .filter((href) => href !== '/dashboard/admin' && pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
  return section ? ADMIN_AREA_PERMS[section] : undefined
}

// Whether a page gated by `perms` opens for this user (see ADMIN_AREA_PERMS)
export function canOpenWith(user: AccessUser, perms: readonly string[] | null | undefined): boolean {
  if (isSuperAdmin(user)) return true
  if (!perms) return false
  if (perms.length === 0) return user?.role === 'staff'
  return canAny(user, perms)
}

// Unknown admin paths are super-admin only
export const canOpenAdminArea = (user: AccessUser, href: string) => canOpenWith(user, adminAreaPermsFor(href))

// A staff account opens the admin dashboard when at least one admin page is theirs
export const hasAdminAreaAccess = (user: AccessUser) =>
  isSuperAdmin(user) ||
  (user?.role === 'staff' &&
    Object.values(ADMIN_AREA_PERMS).some((perms) => perms && perms.length > 0 && canAny(user, perms)))
