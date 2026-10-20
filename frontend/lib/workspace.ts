import { API_BASE_URL } from './api'
import { apiFetch } from './http'
import type { Consultation, LawyerAvailability, LawyerProfileData } from './dashboard'

// One lawyer's work, for the lawyer ('me') and their assistants (a lawyer's id).
// Backend: /api/workspace/:lawyerId (routes/workspace.ts). Single records keep
// their own URLs: /api/cases/:id and /api/consultations/:id/*.
export type WorkspaceLawyerId = 'me' | (string & {})

const workspaceUrl = (lawyerId: WorkspaceLawyerId, path: string) =>
  `${API_BASE_URL}/api/workspace/${encodeURIComponent(lawyerId)}${path}`

/** Error with the server's status and machine code (e.g. EMAIL_NOT_ASSIGNABLE) */
export class WorkspaceApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'WorkspaceApiError'
    this.status = status
    this.code = code
  }
}

async function request<T = unknown>(url: string, init: RequestInit = {}, fallback = 'Request failed'): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  const res = await apiFetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: init.body && !isForm ? { 'Content-Type': 'application/json', ...(init.headers || {}) } : init.headers,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new WorkspaceApiError(body.message || fallback, res.status, body.code)
  return body as T
}

// ─── Lawyer work ──────────────────────────────────────────────────────────────

export interface WorkspaceOverview {
  lawyer: { _id: string; name: string }
  // Each part is present only when the actor may see it
  cases?: { active: number; resolved: number }
  appointments?: {
    total: number
    pending: number
    completed: number
    upcoming: Pick<Consultation, '_id' | 'date' | 'time' | 'subject' | 'status' | 'lawyerConfirmed' | 'meetingMode' | 'clientId'>[]
  }
}

export async function getWorkspaceOverview(lawyerId: WorkspaceLawyerId) {
  const body = await request<{ data: WorkspaceOverview }>(workspaceUrl(lawyerId, '/overview'), {}, 'Failed to load the overview')
  return body.data
}

/** archived: 'false' (default) | 'true' | 'all' */
export async function getWorkspaceCases<T = unknown>(lawyerId: WorkspaceLawyerId, archived: 'false' | 'true' | 'all' = 'false') {
  const body = await request<{ data: T[]; meta: { counts: { active: number; archived: number } } }>(
    workspaceUrl(lawyerId, `/cases?archived=${archived}`),
    {},
    'Failed to fetch cases',
  )
  return body.data ?? []
}

export async function createWorkspaceCase(lawyerId: WorkspaceLawyerId, payload: Record<string, unknown>) {
  return request(workspaceUrl(lawyerId, '/cases'), { method: 'POST', body: JSON.stringify(payload) }, 'Failed to create case')
}

export async function getWorkspaceConsultations(lawyerId: WorkspaceLawyerId): Promise<Consultation[]> {
  const body = await request<{ consultations: Consultation[] }>(workspaceUrl(lawyerId, '/consultations'), {}, 'Failed to fetch consultations')
  return body.consultations ?? []
}

export async function getWorkspaceAvailability(lawyerId: WorkspaceLawyerId): Promise<LawyerAvailability> {
  const body = await request<{ data: LawyerAvailability }>(workspaceUrl(lawyerId, '/availability'), {}, 'Failed to fetch availability')
  return body.data
}

export async function updateWorkspaceAvailability(
  lawyerId: WorkspaceLawyerId,
  payload: Partial<Pick<LawyerAvailability, 'schedule' | 'isAcceptingNewClients'>>,
): Promise<LawyerAvailability> {
  const body = await request<{ data: LawyerAvailability }>(
    workspaceUrl(lawyerId, '/availability'),
    { method: 'PUT', body: JSON.stringify(payload) },
    'Failed to update availability',
  )
  return body.data
}

export async function getWorkspaceProfile(lawyerId: WorkspaceLawyerId): Promise<LawyerProfileData> {
  const body = await request<{ data: LawyerProfileData }>(workspaceUrl(lawyerId, '/profile'), {}, 'Failed to fetch profile')
  return body.data
}

export async function updateWorkspaceProfile(lawyerId: WorkspaceLawyerId, payload: Partial<LawyerProfileData>): Promise<LawyerProfileData> {
  const body = await request<{ data: LawyerProfileData }>(
    workspaceUrl(lawyerId, '/profile'),
    { method: 'PUT', body: JSON.stringify(payload) },
    'Failed to update profile',
  )
  return body.data
}

export async function uploadWorkspaceProfileImage(lawyerId: WorkspaceLawyerId, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const body = await request<{ data: { profileImageUrl: string } }>(
    workspaceUrl(lawyerId, '/profile/image'),
    { method: 'POST', body: formData },
    'Upload failed',
  )
  return body.data.profileImageUrl
}

// ─── The lawyer's assistants ("My Team"; the lawyer's own only) ──────────────

export interface TeamMember {
  staffId: string
  name: string
  email: string
  phone: string | null
  profileImageUrl: string | null
  isBlocked: boolean
  // As chosen (not expanded with implied permissions)
  permissions: string[]
  grantedByRole: 'admin' | 'lawyer'
  createdAt: string
  updatedAt: string
}

export interface TeamActivityEntry {
  _id: string
  actorName?: string
  actorRole: string
  action: string
  category: string
  targetType?: string
  targetLabel?: string
  summary: string
  createdAt: string
}

const TEAM = '/team'

export async function getTeam(): Promise<TeamMember[]> {
  const body = await request<{ data: TeamMember[] }>(workspaceUrl('me', TEAM), {}, 'Failed to load your team')
  return body.data ?? []
}

export async function inviteAssistant(input: { email: string; name?: string; phone?: string; permissions: string[] }) {
  return request<{ message: string; data: TeamMember; created: boolean; emailSent: boolean }>(
    workspaceUrl('me', TEAM),
    { method: 'POST', body: JSON.stringify(input) },
    'Failed to add the assistant',
  )
}

export async function updateAssistant(staffId: string, permissions: string[]) {
  return request<{ message: string; data: TeamMember }>(
    workspaceUrl('me', `${TEAM}/${staffId}`),
    { method: 'PATCH', body: JSON.stringify({ permissions }) },
    'Failed to update permissions',
  )
}

export async function removeAssistant(staffId: string) {
  return request<{ message: string }>(workspaceUrl('me', `${TEAM}/${staffId}`), { method: 'DELETE' }, 'Failed to remove the assistant')
}

export async function getTeamActivity(page = 1) {
  return request<{ data: TeamActivityEntry[]; meta: { total: number; page: number; limit: number } }>(
    workspaceUrl('me', `${TEAM}/activity?page=${page}`),
    {},
    'Failed to load team activity',
  )
}
