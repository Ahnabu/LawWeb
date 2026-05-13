import { API_BASE_URL } from './api'

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
  lawyerId: ConsultationUser
  consultationType: ConsultationType
  date: string
  time: string
  subject: string
  description: string
  status: ConsultationStatus
  notes?: string
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
  const res = await fetch(`${API_BASE_URL}/api/consultations/my-consultations`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch consultations')
  return data.consultations as Consultation[]
}

export async function cancelConsultation(consultationId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/consultations/${consultationId}/cancel`, {
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
  const res = await fetch(`${API_BASE_URL}/api/consultations/${consultationId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, notes }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to update consultation')
}

// ─── Availability API ─────────────────────────────────────────────────────────

export async function getMyAvailability(): Promise<LawyerAvailability> {
  const res = await fetch(`${API_BASE_URL}/api/lawyers/me/availability`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch availability')
  return data.data as LawyerAvailability
}

export async function updateMyAvailability(
  payload: Partial<Pick<LawyerAvailability, 'schedule' | 'isAcceptingNewClients'>>
): Promise<LawyerAvailability> {
  const res = await fetch(`${API_BASE_URL}/api/lawyers/me/availability`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to update availability')
  return data.data as LawyerAvailability
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
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

  const res = await fetch(`${API_BASE_URL}/api/admin/cases?${qs}`, {
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

  const res = await fetch(`${API_BASE_URL}/api/admin/consultations?${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch consultations')
  return { data: data.data, meta: data.meta }
}

export async function getAdminLawyers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/lawyers`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch lawyers')
  return data.data as AdminUser[]
}

export async function getAdminClients(params?: { page?: number }): Promise<{
  data: AdminUser[]
  meta: { total: number; page: number; limit: number }
}> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))

  const res = await fetch(`${API_BASE_URL}/api/admin/clients?${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch clients')
  return { data: data.data, meta: data.meta }
}

export async function toggleLawyerVerification(lawyerId: string): Promise<{ isVerified: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/lawyers/${lawyerId}/toggle-verification`, {
    method: 'PATCH',
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to toggle verification')
  return data.data as { isVerified: boolean }
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
  hourlyRate?: number
  isActive: boolean
  joinedAt?: string
}

export async function getMyLawyerProfile(): Promise<LawyerProfileData> {
  const res = await fetch(`${API_BASE_URL}/api/lawyers/me/profile`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch profile')
  return data.data as LawyerProfileData
}

export async function updateMyLawyerProfile(payload: Partial<LawyerProfileData>): Promise<LawyerProfileData> {
  const res = await fetch(`${API_BASE_URL}/api/lawyers/me/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to update profile')
  return data.data as LawyerProfileData
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
