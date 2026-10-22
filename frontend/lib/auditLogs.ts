import { API_BASE_URL } from './api'
import { apiFetch } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditActorRole = 'admin' | 'staff' | 'lawyer' | 'client' | 'anonymous' | 'system'
export type AuditCategory =
  | 'auth'
  | 'access'
  | 'user'
  | 'lawyer'
  | 'case'
  | 'consultation'
  | 'blog'
  | 'gallery'
  | 'content'
  | 'contact'
  | 'profile'
  | 'system'

export interface AuditLogEntry {
  _id: string
  actor?: string | null
  actorName?: string
  actorEmail?: string
  actorRole: AuditActorRole
  action: string
  category: AuditCategory
  targetType?: string
  targetId?: string
  targetLabel?: string
  summary: string
  metadata?: Record<string, unknown>
  // The lawyer a staff member acted for
  onBehalfOf?: string | null
  onBehalfOfName?: string
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface AuditLogListMeta {
  total: number
  page: number
  limit: number
}

export interface AuditLogFilterMeta {
  categories: AuditCategory[]
  actorRoles: AuditActorRole[]
  actions: string[]
  categoryCounts: Record<string, number>
  retentionDays: number
}

export interface AuditLogQuery {
  page?: number
  limit?: number
  category?: AuditCategory | 'all'
  action?: string
  actorRole?: AuditActorRole | 'all'
  actor?: string
  /** A lawyer's id: what staff did on their behalf */
  onBehalfOf?: string
  search?: string
  /** YYYY-MM-DD, interpreted as a firm (Asia/Dhaka) calendar day */
  from?: string
  /** YYYY-MM-DD, inclusive, interpreted as a firm (Asia/Dhaka) calendar day */
  to?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const auditUrl = (path = '') => `${API_BASE_URL}/api/admin/audit-logs${path}`

async function request<T>(url: string, fallback: string): Promise<{ data: T; meta?: unknown }> {
  const res = await apiFetch(url, { method: 'GET', credentials: 'include', cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || fallback)
  return { data: data.data as T, meta: data.meta }
}

// Dhaka has no daylight saving, so a fixed +06:00 offset is exact
const dhakaDayStart = (day: string) => `${day}T00:00:00.000+06:00`
const dhakaDayEnd = (day: string) => `${day}T23:59:59.999+06:00`

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listAuditLogs(
  params: AuditLogQuery,
): Promise<{ data: AuditLogEntry[]; meta: AuditLogListMeta }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.category && params.category !== 'all') qs.set('category', params.category)
  if (params.action) qs.set('action', params.action)
  if (params.actorRole && params.actorRole !== 'all') qs.set('actorRole', params.actorRole)
  if (params.actor) qs.set('actor', params.actor)
  if (params.onBehalfOf) qs.set('onBehalfOf', params.onBehalfOf)
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.from) qs.set('from', dhakaDayStart(params.from))
  if (params.to) qs.set('to', dhakaDayEnd(params.to))

  const result = await request<AuditLogEntry[]>(auditUrl(`?${qs}`), 'Failed to load audit logs')
  return { data: result.data ?? [], meta: result.meta as AuditLogListMeta }
}

export async function getAuditLogMeta(): Promise<AuditLogFilterMeta> {
  const result = await request<AuditLogFilterMeta>(auditUrl('/meta'), 'Failed to load audit log filters')
  return result.data
}

// ─── Display ──────────────────────────────────────────────────────────────────

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: 'Sign-in & security',
  access: 'Staff & roles',
  user: 'Users',
  lawyer: 'Lawyers',
  case: 'Cases',
  consultation: 'Appointments',
  blog: 'Blog',
  gallery: 'Photo gallery',
  content: 'Website content',
  contact: 'Contact messages',
  profile: 'Profiles',
  system: 'System',
}

export const AUDIT_ROLE_LABELS: Record<AuditActorRole, string> = {
  admin: 'Super Admin',
  staff: 'Staff',
  lawyer: 'Lawyer',
  client: 'Client',
  anonymous: 'Visitor',
  system: 'System',
}

export const AUDIT_ROLE_STYLES: Record<AuditActorRole, string> = {
  admin: 'bg-secondary/15 text-secondary',
  staff: 'bg-secondary/10 text-on-surface',
  lawyer: 'bg-primary/10 text-on-surface',
  client: 'bg-surface-container-high text-on-surface-variant',
  anonymous: 'bg-surface-container text-on-surface-variant',
  system: 'bg-surface-container text-on-surface-variant',
}

// Actions worth drawing the eye to in the list
export const isWarningAction = (action: string) =>
  /login_failed|login_blocked|token_reuse|\.deleted$|\.blocked$|\.archived$/.test(action)

const DHAKA_TZ = 'Asia/Dhaka'

export function formatAuditTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    timeZone: DHAKA_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return '—'
  const seconds = Math.round((now - time) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return new Date(value).toLocaleDateString('en-GB', { timeZone: DHAKA_TZ, day: 'numeric', month: 'short', year: 'numeric' })
}

// Today's date in Dhaka as YYYY-MM-DD (for the date inputs' max)
export function dhakaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DHAKA_TZ }).format(new Date())
}
