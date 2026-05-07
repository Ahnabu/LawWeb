import { API_BASE_URL } from './api'

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

export interface Case {
  _id: string
  caseNumber: string
  clientId?: CaseClient | null
  clientEmail: string
  clientName: string
  lawyerId: CaseLawyer
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
  const res = await fetch(`${API_BASE_URL}/api/cases/my-cases`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch cases')
  return data.data as Case[]
}

export async function getCaseById(caseId: string): Promise<Case> {
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch case')
  return data.data as Case
}

export async function createCase(payload: CreateCasePayload): Promise<Case> {
  const res = await fetch(`${API_BASE_URL}/api/cases`, {
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
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
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
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
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
