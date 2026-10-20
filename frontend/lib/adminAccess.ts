import { API_BASE_URL } from './api'
import { apiFetch } from './http'
import type { BlockState, Result } from './adminUsers'

// Roles, staff accounts and the permission catalog (super-admin pages).
// The backend is the source of truth: backend/src/access/permissions.ts.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalogPermission {
  key: string
  group: string
  label: string
  scope: 'lawyer' | 'firm'
  implies: string[]
}

export interface RoleTemplate {
  name: string
  description: string
  permissions: string[]
}

export interface PermissionCatalog {
  permissions: CatalogPermission[]
  templates: RoleTemplate[]
  delegable: string[]
}

export interface StaffRole {
  _id: string
  name: string
  description?: string
  // As saved (implied permissions are added when the role is loaded)
  permissions: string[]
  staffCount: number
  createdAt?: string
  updatedAt?: string
}

export interface RoleInput {
  name: string
  description?: string
  permissions: string[]
}

export type StaffStatusFilter = 'all' | 'active' | 'blocked'

export interface StaffMember {
  _id: string
  name: string
  email: string
  phone?: string
  role: 'staff'
  // Populated: name (list) or name + permissions (details); null = no role
  staffRoleId: { _id: string; name: string; permissions?: string[] } | null
  isVerified: boolean
  isBlocked?: boolean
  blockedAt?: string | null
  blockedReason?: string | null
  createdAt: string
  updatedAt?: string
  // Newest use of any live session; null when they have none
  lastActiveAt: string | null
  // Details only: the lawyers they assist
  delegations?: StaffDelegation[]
}

// A lawyer a staff member assists. Inactive while the lawyer is blocked or
// removed; it works again once the lawyer is restored.
export interface StaffDelegation {
  lawyerId: string
  lawyerName: string
  lawyerActive: boolean
  // As chosen (not expanded with implied permissions)
  permissions: string[]
  grantedByRole: 'admin' | 'lawyer'
  grantedByName: string | null
  updatedAt: string
}

export interface StaffCounts {
  all: number
  active: number
  blocked: number
}

export interface StaffListMeta {
  total: number
  page: number
  limit: number
  counts: StaffCounts
}

export interface StaffInput {
  name: string
  email: string
  phone?: string
  staffRoleId?: string | null
}

/** Error with the server's code (e.g. ROLE_IN_USE) and any extra fields */
export class AccessApiError extends Error {
  code?: string
  status: number
  body: Record<string, unknown>

  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = typeof body.code === 'string' ? body.code : undefined
    this.body = body
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit, fallback: string): Promise<Result<T> & { meta?: unknown }> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, { credentials: 'include', cache: 'no-store', ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AccessApiError(data?.errors?.[0]?.message || data?.message || fallback, res.status, data ?? {})
  return { message: data.message || '', data: data.data as T, meta: data.meta }
}

const jsonBody = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// ─── Catalog ──────────────────────────────────────────────────────────────────

export async function getPermissionCatalog(): Promise<PermissionCatalog> {
  return (await request<PermissionCatalog>('/api/access/catalog', { method: 'GET' }, 'Failed to load permissions')).data
}

// Every permission the selected ones include, mapped to the selected one that
// includes it (for "Included by …"). A selected key can appear too, when another
// selected key already includes it. Mirrors withImplied on the backend.
export function impliedBy(selected: readonly string[], catalog: readonly CatalogPermission[]): Map<string, string> {
  const byKey = new Map(catalog.map((p) => [p.key, p]))
  const out = new Map<string, string>()
  const queue = selected.map((key) => [key, key] as const)
  while (queue.length) {
    const [key, root] = queue.shift()!
    for (const implied of byKey.get(key)?.implies ?? []) {
      if (out.has(implied) || implied === root) continue
      out.set(implied, root)
      queue.push([implied, root])
    }
  }
  return out
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<StaffRole[]> {
  return (await request<StaffRole[]>('/api/admin/roles', { method: 'GET' }, 'Failed to load roles')).data ?? []
}

export function createRole(input: RoleInput): Promise<Result<StaffRole>> {
  return request('/api/admin/roles', { method: 'POST', ...jsonBody(input) }, 'Failed to create role')
}

export function updateRole(roleId: string, input: Partial<RoleInput>): Promise<Result<StaffRole>> {
  return request(`/api/admin/roles/${roleId}`, { method: 'PATCH', ...jsonBody(input) }, 'Failed to update role')
}

/** reassignTo: another role's id, or "none" to leave its staff without a role */
export function deleteRole(roleId: string, reassignTo?: string): Promise<Result<{ _id: string; staffMoved: number }>> {
  const qs = reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : ''
  return request(`/api/admin/roles/${roleId}${qs}`, { method: 'DELETE' }, 'Failed to delete role')
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export async function listStaff(params: {
  search?: string
  status?: StaffStatusFilter
  page?: number
  limit?: number
}): Promise<{ data: StaffMember[]; meta: StaffListMeta }> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.status && params.status !== 'all') qs.set('status', params.status)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))

  const result = await request<StaffMember[]>(`/api/admin/staff?${qs}`, { method: 'GET' }, 'Failed to load staff')
  return { data: result.data ?? [], meta: result.meta as StaffListMeta }
}

export async function getStaffMember(staffId: string): Promise<StaffMember> {
  return (await request<StaffMember>(`/api/admin/staff/${staffId}`, { method: 'GET' }, 'Failed to load staff member')).data
}

export function createStaff(input: StaffInput): Promise<Result<StaffMember> & { emailSent?: boolean }> {
  return request('/api/admin/staff', { method: 'POST', ...jsonBody(input) }, 'Failed to add staff member')
}

export function updateStaff(
  staffId: string,
  input: { name?: string; phone?: string; staffRoleId?: string | null },
): Promise<Result<StaffMember>> {
  return request(`/api/admin/staff/${staffId}`, { method: 'PATCH', ...jsonBody(input) }, 'Failed to update staff member')
}

export function blockStaff(staffId: string, reason?: string): Promise<Result<BlockState>> {
  return request(
    `/api/admin/staff/${staffId}/block`,
    { method: 'PATCH', ...jsonBody(reason?.trim() ? { reason: reason.trim() } : {}) },
    'Failed to block staff member',
  )
}

export function unblockStaff(staffId: string): Promise<Result<BlockState>> {
  return request(`/api/admin/staff/${staffId}/unblock`, { method: 'PATCH' }, 'Failed to unblock staff member')
}

// ─── Lawyers a staff member assists ───────────────────────────────────────────
// Each call answers with the staff member's full delegation list

export function grantStaffDelegation(staffId: string, lawyerId: string, permissions: string[]): Promise<Result<StaffDelegation[]>> {
  return request(`/api/admin/staff/${staffId}/delegations`, { method: 'POST', ...jsonBody({ lawyerId, permissions }) }, 'Failed to add the lawyer')
}

export function updateStaffDelegation(staffId: string, lawyerId: string, permissions: string[]): Promise<Result<StaffDelegation[]>> {
  return request(`/api/admin/staff/${staffId}/delegations/${lawyerId}`, { method: 'PATCH', ...jsonBody({ permissions }) }, 'Failed to update permissions')
}

export function revokeStaffDelegation(staffId: string, lawyerId: string): Promise<Result<StaffDelegation[]>> {
  return request(`/api/admin/staff/${staffId}/delegations/${lawyerId}`, { method: 'DELETE' }, 'Failed to remove the lawyer')
}

export function deleteStaff(staffId: string): Promise<Result<{ _id: string }>> {
  return request(`/api/admin/staff/${staffId}`, { method: 'DELETE' }, 'Failed to delete staff member')
}
