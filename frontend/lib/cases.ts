import { API_BASE_URL } from './api'
import { apiFetch } from './http'

export type CaseType =
  | 'immigration'
  | 'criminal'
  | 'civil'
  | 'corporate'
  | 'family'
  | 'real-estate'
  | 'intellectual-property'
  | 'banking-finance'

export type CaseStatus =
  | 'active'
  | 'filed'
  | 'hearing-scheduled'
  | 'under-review'
  | 'closed'
  | 'won'
  | 'lost'

export interface CaseLawyer {
  _id: string
  name: string
  email: string
  barId?: string
  phone?: string
}

export interface CaseClient {
  _id: string
  name: string
  email: string
  phone?: string
}

export type CaseArchiveReason = 'manual' | 'lawyer-deleted'

// Snapshot kept on a case after its lawyer account was deleted
export interface FormerLawyer {
  name: string
  email?: string
  barId?: string
}

export interface CaseArchiveFields {
  isArchived?: boolean
  archivedAt?: string | null
  archivedBy?: { _id: string; name?: string; role?: string } | string | null
  archiveReason?: CaseArchiveReason | null
  archiveNote?: string
  formerLawyer?: FormerLawyer | null
}

export interface Case extends CaseArchiveFields {
  _id: string
  caseNumber: string
  clientId?: CaseClient | null
  clientEmail: string
  clientName: string
  // null once the assigned lawyer account has been deleted
  lawyerId: CaseLawyer | null
  type: CaseType
  title: string
  description: string
  status: CaseStatus
  isOnline: boolean
  nextCourtDate?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCasePayload {
  lawyerId: string
  clientId?: string
  clientEmail: string
  clientName: string
  type: CaseType
  title: string
  description: string
  isOnline?: boolean
  nextCourtDate?: string
}

export async function getMyCases(): Promise<Case[]> {
  const res = await apiFetch(`${API_BASE_URL}/api/cases/my-cases`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch cases')
  return data.data as Case[]
}

export async function getCaseById(caseId: string): Promise<Case> {
  const res = await apiFetch(`${API_BASE_URL}/api/cases/${caseId}`, {
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch case')
  return data.data as Case
}

export async function createCase(payload: CreateCasePayload): Promise<Case> {
  const res = await apiFetch(`${API_BASE_URL}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to create case')
  return data.data as Case
}

export async function updateCase(
  caseId: string,
  updates: { status?: CaseStatus; notes?: string; nextCourtDate?: string }
): Promise<Case> {
  const res = await apiFetch(`${API_BASE_URL}/api/cases/${caseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to update case')
  return data.data as Case
}

export async function deleteCase(caseId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/cases/${caseId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to delete case')
}

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  immigration: 'Immigration',
  criminal: 'Criminal',
  civil: 'Civil',
  corporate: 'Corporate',
  family: 'Family',
  'real-estate': 'Real Estate',
  'intellectual-property': 'Intellectual Property',
  'banking-finance': 'Banking & Finance',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  active: 'Active',
  filed: 'Filed',
  'hearing-scheduled': 'Hearing Scheduled',
  'under-review': 'Under Review',
  closed: 'Closed',
  won: 'Won',
  lost: 'Lost',
}

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  active: 'bg-success/15 text-success',
  filed: 'bg-secondary/15 text-secondary',
  'hearing-scheduled': 'bg-blue-500/15 text-blue-500',
  'under-review': 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  closed: 'bg-outline/20 text-on-surface-variant',
  won: 'bg-success/20 text-success',
  lost: 'bg-error/15 text-error',
}

// ---------------------------------------------------------------------------
// Archiving
// ---------------------------------------------------------------------------

/** Error carrying the server's HTTP status and optional machine code (e.g. LAWYER_REQUIRED) */
export class CaseApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'CaseApiError'
    this.status = status
    this.code = code
  }
}

interface CaseActionResult<T> {
  message: string
  data: T
}

async function caseAction<T>(url: string, init: RequestInit, fallback: string): Promise<CaseActionResult<T>> {
  const res = await apiFetch(url, {
    credentials: 'include',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...(init.headers || {}) } : init.headers,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new CaseApiError(body.message || fallback, res.status, body.code)
  return { message: body.message || fallback, data: body.data as T }
}

/** Archive a case. Admins use the admin route; lawyers can only archive their own cases. */
export function archiveCase<T = Case>(caseId: string, options: { note?: string; asAdmin?: boolean } = {}) {
  const base = options.asAdmin ? `${API_BASE_URL}/api/admin/cases` : `${API_BASE_URL}/api/cases`
  return caseAction<T>(
    `${base}/${caseId}/archive`,
    { method: 'PATCH', body: JSON.stringify({ note: options.note?.trim() || undefined }) },
    'Failed to archive case',
  )
}

/**
 * Restore an archived case. Admins may pass lawyerId to reassign; the server answers
 * 400 with code LAWYER_REQUIRED when the original lawyer is gone and none was given.
 */
export function restoreCase<T = Case>(caseId: string, options: { lawyerId?: string; asAdmin?: boolean } = {}) {
  const base = options.asAdmin ? `${API_BASE_URL}/api/admin/cases` : `${API_BASE_URL}/api/cases`
  return caseAction<T>(
    `${base}/${caseId}/restore`,
    { method: 'PATCH', body: JSON.stringify(options.lawyerId ? { lawyerId: options.lawyerId } : {}) },
    'Failed to restore case',
  )
}

/** Permanently delete an archived case (admin only; active cases are refused with 409). */
export function deleteArchivedCase(caseId: string) {
  return caseAction<null>(`${API_BASE_URL}/api/admin/cases/${caseId}`, { method: 'DELETE' }, 'Failed to delete case')
}

type LawyerRef = { name?: string } | string | null | undefined

/** Name of the assigned lawyer, falling back to the snapshot kept after account deletion */
export function caseLawyerName(c: { lawyerId?: LawyerRef; formerLawyer?: FormerLawyer | null }): string {
  if (c.lawyerId && typeof c.lawyerId === 'object' && c.lawyerId.name) return c.lawyerId.name
  if (c.formerLawyer?.name) return `${c.formerLawyer.name} (former)`
  return '—'
}

/** True when the case points at a lawyer account that no longer exists */
export function hasDeletedLawyer(c: { lawyerId?: LawyerRef; archiveReason?: CaseArchiveReason | null }): boolean {
  return c.archiveReason === 'lawyer-deleted' || !c.lawyerId
}

export function archivedByName(c: CaseArchiveFields): string | undefined {
  return c.archivedBy && typeof c.archivedBy === 'object' ? c.archivedBy.name : undefined
}

/** Short human label for why a case is archived */
export function archiveReasonLabel(c: CaseArchiveFields): string {
  if (c.archiveReason === 'lawyer-deleted') return 'Lawyer removed'
  const by = archivedByName(c)
  return by ? `Archived by ${by}` : 'Archived'
}

export function formatCaseDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Lawyers can restore only cases they archived themselves; anything else needs an admin */
export function canLawyerRestore(c: CaseArchiveFields, userId?: string | null): boolean {
  if (!c.isArchived || c.archiveReason !== 'manual' || !userId) return false
  const byId = c.archivedBy && typeof c.archivedBy === 'object' ? c.archivedBy._id : c.archivedBy
  return byId === userId
}
