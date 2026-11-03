import { API_BASE_URL } from './api'
import { apiFetch } from './http'
import type { ConsultationFee } from './fees'

// ─── Consultation types ───────────────────────────────────────────────────────

export type ConsultationType = 'initial-consultation' | 'follow-up' | 'document-review' | 'case-discussion'
export type ConsultationStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'

export interface ConsultationUser {
  _id: string
  name: string
  email: string
  phone?: string
  barId?: string
}

export interface Consultation {
  _id: string
  clientId: ConsultationUser
  // null once the lawyer's account is deleted; formerLawyerName keeps the name
  lawyerId: ConsultationUser | null
  formerLawyerName?: string
  // Set when the firm cancelled the booking (e.g. the lawyer left)
  cancellationReason?: string
  consultationType: ConsultationType
  meetingMode?: 'in-person' | 'phone' | 'video'
  date: string
  time: string
  subject: string
  description: string
  status: ConsultationStatus
  notes?: string
  clientPhone?: string
  lawyerConfirmed?: boolean
  whatsappDocSharing?: boolean
  whatsappDocNote?: string
  createdAt: string
  updatedAt: string
}

// ─── Admin stats ──────────────────────────────────────────────────────────────

export interface AdminStats {
  totalCases: number
  activeCases: number
  totalLawyers: number
  totalClients: number
  todayConsultations: number
}

// ─── Admin user ───────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string
  name: string
  email: string
  phone?: string
  barId?: string
  isVerified: boolean
  createdAt: string
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface DaySchedule {
  isAvailable: boolean
  startTime: string
  endTime: string
}

export interface LawyerAvailability {
  _id?: string
  lawyerId: string
  isAcceptingNewClients: boolean
  schedule: {
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule
  }
}

// ─── Consultation API ─────────────────────────────────────────────────────────

export async function getMyConsultations(): Promise<Consultation[]> {
  const res = await apiFetch(`${API_BASE_URL}/api/consultations/my-consultations`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch consultations')
  return data.consultations as Consultation[]
}

export async function cancelConsultation(consultationId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/consultations/${consultationId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to cancel consultation')
}

export async function updateConsultationStatus(
  consultationId: string,
  status: ConsultationStatus,
  notes?: string
): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/consultations/${consultationId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, notes }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to update consultation')
}

// Lawyer availability and profile calls are in lib/workspace.ts

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/stats`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch stats')
  return data.data as AdminStats
}

export async function getAdminCases(params?: { status?: string; page?: number }): Promise<{
  data: import('./cases').Case[]
  meta: { total: number; page: number; limit: number }
}> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))

  const res = await apiFetch(`${API_BASE_URL}/api/admin/cases?${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch cases')
  return { data: data.data, meta: data.meta }
}

export async function getAdminConsultations(params?: { status?: string; page?: number }): Promise<{
  data: Consultation[]
  meta: { total: number; page: number; limit: number }
}> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))

  const res = await apiFetch(`${API_BASE_URL}/api/admin/consultations?${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch consultations')
  return { data: data.data, meta: data.meta }
}

export async function getAdminClients(params?: { page?: number }): Promise<{
  data: AdminUser[]
  meta: { total: number; page: number; limit: number }
}> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))

  const res = await apiFetch(`${API_BASE_URL}/api/admin/clients?${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch clients')
  return { data: data.data, meta: data.meta }
}

// ─── Admin lawyers ────────────────────────────────────────────────────────────

export interface AdminLawyer extends AdminUser {
  specialization?: string
  passwordNeedsChange?: boolean
  profileImageUrl?: string
  /** Position on the public site (ascending) */
  sortOrder: number
  isBlocked?: boolean
  blockedAt?: string
  blockedReason?: string
  /** Set once the lawyer is removed (soft-deleted); null or absent for current lawyers */
  deletedAt?: string | null
  /** Removal clean-up (archiving cases, cancelling appointments) has not finished yet */
  deletionPending?: boolean
  designation: { en: string; bn: string }
  consultationFee?: ConsultationFee
  updatedAt?: string
}

export interface AdminLawyerCounts {
  current: number
  removed: number
}

export interface AdminLawyerDetails extends AdminLawyer {
  stats: { totalCases: number; activeCases: number; totalConsultations: number }
  /** Staff who assist this lawyer (permissions as chosen) */
  assistants?: { staffId: string; name: string; permissions: string[] }[]
}

export interface LawyerInput {
  name: string
  email: string
  phone: string
  barId: string
  specialization: string
}

export interface LawyerUpdateInput extends Partial<LawyerInput> {
  designation?: { en?: string; bn?: string }
  consultationFee?: Partial<ConsultationFee>
}

export interface LawyerDeletionImpact {
  lawyer: { _id: string; name: string; email: string }
  openCases: number
  openCaseList: { _id: string; caseNumber: string; title: string; status: string }[]
  totalCases: number
  archivedCases: number
  upcomingConsultations: number
  upcomingConsultationList: { _id: string; date: string; time: string; subject: string; clientName: string }[]
  affectedClients: number
  pastConsultations: number
  hasProfile: boolean
  hasAvailability: boolean
  /** Staff who assist this lawyer; they lose access until the lawyer is restored */
  assistantCount?: number
}

export interface LawyerDeletionSummary {
  archivedCases: number
  cancelledConsultations: number
  notifiedClients: number
  emailFailures: number
  cancelFailures: number
  /** Some clean-up is left; calling remove again finishes it */
  pending: boolean
}

/** Server message + payload, so callers can toast exactly what the API said */
export interface ApiResult<T> {
  message: string
  data: T
}

async function adminRequest<T>(path: string, init: RequestInit = {}, fallback = 'Request failed'): Promise<ApiResult<T>> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    // FormData sets its own multipart Content-Type
    headers: init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || fallback)
  return { message: body?.message || '', data: body?.data as T }
}

/** Current lawyers in public order, or removed ones (newest removal first) */
export async function getAdminLawyers(
  options: { removed?: boolean } = {}
): Promise<{ lawyers: AdminLawyer[]; counts: AdminLawyerCounts | null }> {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/lawyers${options.removed ? '?removed=true' : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || 'Failed to fetch lawyers')
  return { lawyers: body?.data ?? [], counts: body?.meta?.counts ?? null }
}

export function getAdminLawyerDetails(lawyerId: string) {
  return adminRequest<AdminLawyerDetails>(`/api/admin/lawyers/${lawyerId}`, {}, 'Failed to load lawyer details')
}

export async function addAdminLawyer(input: LawyerInput): Promise<ApiResult<AdminLawyer> & { emailSent: boolean }> {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/lawyers`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || 'Failed to add lawyer')
  return { message: body.message, data: body.data, emailSent: body.emailSent !== false }
}

export function updateAdminLawyer(lawyerId: string, input: LawyerUpdateInput) {
  return adminRequest<AdminLawyer>(
    `/api/admin/lawyers/${lawyerId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    'Failed to update lawyer'
  )
}

/** Sets or replaces the lawyer's public profile photo */
export function uploadAdminLawyerPhoto(lawyerId: string, file: File) {
  const form = new FormData()
  form.append('image', file)
  return adminRequest<AdminLawyer>(
    `/api/admin/lawyers/${lawyerId}/photo`,
    { method: 'POST', body: form },
    'The photo could not be uploaded'
  )
}

/** Saves the public display order; `order` is every lawyer id, first to last */
export function reorderAdminLawyers(order: string[]) {
  return adminRequest<{ _id: string; sortOrder: number }[]>(
    '/api/admin/lawyers/order',
    { method: 'PUT', body: JSON.stringify({ order }) },
    'Failed to save the lawyer order'
  )
}

export function getLawyerDeletionImpact(lawyerId: string) {
  return adminRequest<LawyerDeletionImpact>(
    `/api/admin/lawyers/${lawyerId}/deletion-impact`,
    {},
    'Could not check what deleting this lawyer affects'
  )
}

/** Soft delete. Also finishes the clean-up of a lawyer whose removal is still pending. */
export function deleteAdminLawyer(lawyerId: string) {
  return adminRequest<LawyerDeletionSummary>(
    `/api/admin/lawyers/${lawyerId}`,
    { method: 'DELETE' },
    'Failed to remove lawyer'
  )
}

export function restoreAdminLawyer(lawyerId: string) {
  return adminRequest<AdminLawyer>(
    `/api/admin/lawyers/${lawyerId}/restore`,
    { method: 'PATCH' },
    'Failed to restore lawyer'
  )
}

export function toggleLawyerVerification(lawyerId: string) {
  return adminRequest<{ _id: string; isVerified: boolean }>(
    `/api/admin/lawyers/${lawyerId}/toggle-verification`,
    { method: 'PATCH' },
    'Failed to update verification'
  )
}

export interface BlockState {
  _id: string
  isBlocked: boolean
  blockedAt?: string | null
  blockedReason?: string | null
}

// Account block endpoints are shared with user management
export function blockAdminUser(userId: string, reason?: string) {
  return adminRequest<BlockState>(
    `/api/admin/users/${userId}/block`,
    { method: 'PATCH', body: JSON.stringify(reason ? { reason } : {}) },
    'Failed to block account'
  )
}

export function unblockAdminUser(userId: string) {
  return adminRequest<BlockState>(`/api/admin/users/${userId}/unblock`, { method: 'PATCH' }, 'Failed to unblock account')
}

// ─── Lawyer Profile ───────────────────────────────────────────────────────────

export interface BilingualField {
  en: string
  bn: string
}

export interface Education {
  degree: string
  institution: string
  year: number
  description?: BilingualField
}

export interface Certification {
  name: string
  issuingBody: string
  year: number
  description?: BilingualField
}

export interface LawyerProfileData {
  _id?: string
  userId?: string
  firstName: string
  lastName: string
  profileImageUrl?: string
  designation: BilingualField
  bio: BilingualField
  contactEmail?: string
  contactPhone?: string
  whatsappNumber?: string
  barNumber?: string
  yearAdmitted?: number
  practiceAreas: string[]
  languages: string[]
  education: Education[]
  certifications: Certification[]
  consultationFee?: ConsultationFee
  isActive: boolean
  joinedAt?: string
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  'initial-consultation': 'Initial Consultation',
  'follow-up': 'Follow-up',
  'document-review': 'Document Review',
  'case-discussion': 'Case Discussion',
}

export const CONSULTATION_STATUS_COLORS: Record<ConsultationStatus, string> = {
  scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-error/15 text-error',
  rescheduled: 'bg-secondary/15 text-secondary',
}

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
}
