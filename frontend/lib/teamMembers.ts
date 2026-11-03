import { API_BASE_URL } from './api'
import { apiFetch } from './http'
import type { Result } from './adminUsers'

// The admins and staff shown on the public "Our Team" page, below the lawyers.
// These are public profiles, not login accounts.

export interface TeamMember {
  _id: string
  name: string
  // Free text: the job title the firm writes
  role: string
  photoUrl?: string
  phone?: string
  email?: string
  bio?: string
  sortOrder: number
  isVisible?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TeamMemberInput {
  name: string
  role: string
  photoUrl?: string
  phone?: string
  email?: string
  bio?: string
  isVisible?: boolean
}

export interface AdminTeamMemberMeta {
  total: number
  page: number
  limit: number
  counts: { all: number; visible: number }
}

async function adminRequest<T>(path: string, init: RequestInit, fallback: string) {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  const res = await apiFetch(`${API_BASE_URL}/api/team${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: init.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.errors?.[0]?.message || body?.message || fallback)
  return { message: (body?.message as string) || '', data: body?.data as T, meta: body?.meta }
}

const jsonBody = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** The visible team members, in display order */
export async function listPublicTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch(`${API_BASE_URL}/api/team`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load the team')
  const body = await res.json().catch(() => ({}))
  return (body?.data ?? []) as TeamMember[]
}

export async function listAdminTeamMembers(params: {
  search?: string
  page?: number
  limit?: number
}): Promise<{ data: TeamMember[]; meta: AdminTeamMemberMeta | null }> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  const result = await adminRequest<TeamMember[]>(`/admin/all?${qs}`, { method: 'GET' }, 'Failed to load the team')
  return { data: result.data ?? [], meta: (result.meta ?? null) as AdminTeamMemberMeta | null }
}

export function createTeamMember(input: TeamMemberInput): Promise<Result<TeamMember>> {
  return adminRequest('/', { method: 'POST', ...jsonBody(input) }, 'Failed to add the team member')
}

export function updateTeamMember(id: string, input: Partial<TeamMemberInput>): Promise<Result<TeamMember>> {
  return adminRequest(`/${id}`, { method: 'PATCH', ...jsonBody(input) }, 'Failed to save the team member')
}

export function deleteTeamMember(id: string): Promise<Result<{ _id: string }>> {
  return adminRequest(`/${id}`, { method: 'DELETE' }, 'Failed to remove the team member')
}

/** The new order of every member, first to last */
export function reorderTeamMembers(order: string[]): Promise<Result<{ _id: string; sortOrder: number }[]>> {
  return adminRequest('/order', { method: 'PUT', ...jsonBody({ order }) }, 'Failed to save the order')
}

export async function uploadTeamMemberPhoto(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('image', file)
  const res = await apiFetch(`${API_BASE_URL}/api/team/upload/photo`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || 'The photo could not be uploaded')
  return { url: body.url as string }
}
