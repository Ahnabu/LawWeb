import { API_BASE_URL } from './api'
import { apiFetch } from './http'
import type { Result } from './adminUsers'

// Career openings. The admin posts them from the dashboard; the public Careers
// page lists the published ones and shows the details as formatted text.

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship'
export type WorkplaceType = 'on-site' | 'hybrid' | 'remote'
export type CareerStatus = 'draft' | 'published' | 'closed'

export interface CareerOpening {
  _id: string
  title: string
  slug: string
  department: string
  employmentType: EmploymentType
  workplaceType: WorkplaceType
  location?: string
  experience?: string
  salary?: string
  deadline?: string | null
  status: CareerStatus
  description: string
  requirements: string
  applicationEmail?: string
  applicationUrl?: string
  applicationInstructions?: string
  authorName?: string
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface CareerInput {
  title: string
  department: string
  employmentType: EmploymentType
  workplaceType: WorkplaceType
  location: string
  experience: string
  salary: string
  deadline: string
  description: string
  requirements: string
  applicationEmail: string
  applicationUrl: string
  applicationInstructions: string
  status: CareerStatus
}

export interface AdminCareersMeta {
  total: number
  page: number
  limit: number
  counts: Record<string, number>
}

const CAREER_REVALIDATE_SECONDS = 300

async function adminRequest<T>(path: string, init: RequestInit, fallback: string) {
  const res = await apiFetch(`${API_BASE_URL}/api/careers${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.errors?.[0]?.message || body?.message || fallback)
  return { message: (body?.message as string) || '', data: body?.data as T, meta: body?.meta }
}

const jsonBody = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// ── Public ────────────────────────────────────────────────────────────────────

/** The published openings, with the department filter and the search text */
export async function listPublicCareers(params: {
  search?: string
  department?: string
  page?: number
  limit?: number
}): Promise<{ data: CareerOpening[]; meta: { total: number; page: number; limit: number } | null }> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.department && params.department !== 'all') qs.set('department', params.department)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  const res = await fetch(`${API_BASE_URL}/api/careers?${qs}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load the openings')
  const body = await res.json().catch(() => ({}))
  return {
    data: (body?.data ?? []) as CareerOpening[],
    meta: (body?.meta ?? null) as { total: number; page: number; limit: number } | null,
  }
}

/** The departments that have published openings, for the filter chips */
export async function listCareerDepartments(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/careers/departments`, { cache: 'no-store' })
  if (!res.ok) return []
  const body = await res.json().catch(() => ({}))
  return (body?.data ?? []) as string[]
}

/** A published opening, or null when there is none with this slug */
export async function getPublishedCareer(slug: string): Promise<CareerOpening | null> {
  const res = await fetch(`${API_BASE_URL}/api/careers/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: CAREER_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Career request failed with ${res.status}`)
  const body = (await res.json()) as { data?: CareerOpening }
  return body.data ?? null
}

/** Every published opening for the sitemap; empty if the backend is down */
export async function getPublishedCareerSummaries(): Promise<{ slug: string; publishedAt?: string; createdAt?: string }[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/careers?limit=1000`, {
      next: { revalidate: CAREER_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const body = (await res.json()) as { data?: Partial<CareerOpening>[] }
    return (body.data ?? []).flatMap((career) => (career.slug ? [{ ...career, slug: career.slug }] : []))
  } catch {
    return []
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listAdminCareers(params: {
  status?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ data: CareerOpening[]; meta: AdminCareersMeta | null }> {
  const qs = new URLSearchParams()
  if (params.status && params.status !== 'all') qs.set('status', params.status)
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  const result = await adminRequest<CareerOpening[]>(`/admin/all?${qs}`, { method: 'GET' }, 'Failed to load the openings')
  return { data: result.data ?? [], meta: (result.meta ?? null) as AdminCareersMeta | null }
}

export async function getAdminCareer(id: string): Promise<CareerOpening> {
  const result = await adminRequest<CareerOpening>(`/admin/${id}`, { method: 'GET' }, 'Failed to load the opening')
  return result.data
}

export function createCareer(input: CareerInput): Promise<Result<CareerOpening>> {
  return adminRequest('/', { method: 'POST', ...jsonBody(input) }, 'Failed to save the opening')
}

export function updateCareer(id: string, input: Partial<CareerInput>): Promise<Result<CareerOpening>> {
  return adminRequest(`/${id}`, { method: 'PATCH', ...jsonBody(input) }, 'Failed to save the opening')
}

export function deleteCareer(id: string): Promise<Result<{ _id: string }>> {
  return adminRequest(`/${id}`, { method: 'DELETE' }, 'Failed to delete the opening')
}
