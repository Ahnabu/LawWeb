import { API_BASE_URL } from './api'
import { apiFetch } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserStatusFilter = 'all' | 'active' | 'blocked' | 'unverified'
export type UserSort = 'newest' | 'oldest' | 'name'

export interface ManagedUser {
  _id: string
  name: string
  email: string
  phone?: string
  role: 'admin' | 'lawyer' | 'client'
  isVerified: boolean
  isBlocked?: boolean
  blockedAt?: string | null
  profileImageUrl?: string
  createdAt: string
}

export interface ManagedUserDetail extends ManagedUser {
  barId?: string
  specialization?: string
  blockedReason?: string | null
  passwordChangedAt?: string
  updatedAt?: string
}

export interface UserCounts {
  all: number
  active: number
  blocked: number
  unverified: number
}

export interface UserListMeta {
  total: number
  page: number
  limit: number
  counts: UserCounts
}

export interface PersonRef {
  _id: string
  name?: string
  email?: string
}

export interface UserCaseSummary {
  _id: string
  caseNumber?: string
  title: string
  status: string
  type: string
  isArchived?: boolean
  clientName?: string
  clientEmail?: string
  lawyerId?: PersonRef | null
  createdAt: string
}

export interface UserConsultationSummary {
  _id: string
  date: string
  time: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  subject: string
  consultationType?: string
  meetingMode?: string
  lawyerConfirmed?: boolean
  lawyerId?: PersonRef | null
  clientId?: PersonRef | null
  createdAt: string
}

export interface UserStats {
  totalCases: number
  activeCases: number
  archivedCases: number
  totalConsultations: number
  upcomingConsultations: number
  completedConsultations: number
  cancelledConsultations: number
}

export interface UserDetailsResponse {
  user: ManagedUserDetail
  cases: UserCaseSummary[]
  consultations: UserConsultationSummary[]
  stats: UserStats
}

export interface BlockState {
  _id: string
  isBlocked: boolean
  blockedAt: string | null
  blockedReason: string | null
}

export interface DeleteUserResult {
  _id: string
  cancelledConsultations: number
  detachedCases: number
}

/** Successful mutation: the server's message for the toast plus the payload */
export interface Result<T> {
  message: string
  data: T
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const usersUrl = (path = '') => `${API_BASE_URL}/api/admin/users${path}`

async function request<T>(url: string, init: RequestInit, fallback: string): Promise<Result<T> & { meta?: unknown }> {
  const res = await apiFetch(url, { credentials: 'include', cache: 'no-store', ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || fallback)
  return { message: data.message || '', data: data.data as T, meta: data.meta }
}

const jsonBody = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listUsers(params: {
  search?: string
  status?: UserStatusFilter
  page?: number
  limit?: number
  sort?: UserSort
}): Promise<{ data: ManagedUser[]; meta: UserListMeta }> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.status && params.status !== 'all') qs.set('status', params.status)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.sort) qs.set('sort', params.sort)

  const result = await request<ManagedUser[]>(usersUrl(`?${qs}`), { method: 'GET' }, 'Failed to load users')
  return { data: result.data ?? [], meta: result.meta as UserListMeta }
}

export async function getUserDetails(userId: string): Promise<UserDetailsResponse> {
  const result = await request<UserDetailsResponse>(usersUrl(`/${userId}`), { method: 'GET' }, 'Failed to load user details')
  return result.data
}

export function updateUser(
  userId: string,
  payload: { name?: string; phone?: string; email?: string },
): Promise<Result<ManagedUserDetail>> {
  return request(usersUrl(`/${userId}`), { method: 'PATCH', ...jsonBody(payload) }, 'Failed to update user')
}

export function blockUser(userId: string, reason?: string): Promise<Result<BlockState>> {
  return request(
    usersUrl(`/${userId}/block`),
    { method: 'PATCH', ...jsonBody(reason?.trim() ? { reason: reason.trim() } : {}) },
    'Failed to block user',
  )
}

export function unblockUser(userId: string): Promise<Result<BlockState>> {
  return request(usersUrl(`/${userId}/unblock`), { method: 'PATCH' }, 'Failed to unblock user')
}

export function deleteUser(userId: string): Promise<Result<DeleteUserResult>> {
  return request(usersUrl(`/${userId}`), { method: 'DELETE' }, 'Failed to delete user')
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'blocked' | 'unverified'

export function userStatusOf(user: Pick<ManagedUser, 'isBlocked' | 'isVerified'>): UserStatus {
  if (user.isBlocked) return 'blocked'
  return user.isVerified ? 'active' : 'unverified'
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  blocked: 'Blocked',
  unverified: 'Unverified',
}

export const USER_STATUS_STYLES: Record<UserStatus, string> = {
  active: 'bg-green-500/10 text-green-700',
  blocked: 'bg-error/10 text-error',
  unverified: 'bg-secondary/10 text-secondary',
}

export function formatDate(value?: string | null, withTime = false): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}
