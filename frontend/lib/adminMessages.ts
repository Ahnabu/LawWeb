import { API_BASE_URL } from './api'
import { apiFetch } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageStatus = 'new' | 'read' | 'archived'
// "all" = the inbox: every message except archived ones
export type MessageFilter = 'all' | MessageStatus

export interface ContactMessage {
  _id: string
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  status: MessageStatus
  readAt?: string
  createdAt: string
}

export type MessageCounts = Record<MessageFilter, number>

export interface MessageListMeta {
  total: number
  page: number
  limit: number
  counts: MessageCounts
}

export interface Result<T> {
  message: string
  data: T
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const messagesUrl = (path = '') => `${API_BASE_URL}/api/admin/messages${path}`

async function request<T>(url: string, init: RequestInit, fallback: string): Promise<Result<T> & { meta?: unknown }> {
  const res = await apiFetch(url, { credentials: 'include', cache: 'no-store', ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.errors?.[0]?.message || data?.message || fallback)
  return { message: data.message || '', data: data.data as T, meta: data.meta }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listMessages(params: {
  search?: string
  status?: MessageFilter
  page?: number
  limit?: number
}): Promise<{ data: ContactMessage[]; meta: MessageListMeta }> {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.status && params.status !== 'all') qs.set('status', params.status)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))

  const result = await request<ContactMessage[]>(messagesUrl(`?${qs}`), { method: 'GET' }, 'Failed to load messages')
  return { data: result.data ?? [], meta: result.meta as MessageListMeta }
}

export function setMessageStatus(messageId: string, status: MessageStatus): Promise<Result<ContactMessage>> {
  return request(
    messagesUrl(`/${messageId}`),
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) },
    'Failed to update message',
  )
}

export function deleteMessage(messageId: string): Promise<Result<{ _id: string }>> {
  return request(messagesUrl(`/${messageId}`), { method: 'DELETE' }, 'Failed to delete message')
}
