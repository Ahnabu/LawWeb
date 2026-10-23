import { API_BASE_URL } from './api'
import { apiFetch } from './http'
import type { Locale } from './i18n'

// ── Photo gallery ─────────────────────────────────────────────────────────────
// Public list for app/gallery, and the admin API behind /dashboard/admin/gallery
// (backend routes/gallery.ts and the gallery routes in routes/admin.ts).

export const GALLERY_TITLE_MAX = 120
export const GALLERY_DESCRIPTION_MAX = 5000

export interface GalleryText {
  en: string
  bn: string
}

export interface GalleryImage {
  _id: string
  imageUrl: string
  title: GalleryText
  description: GalleryText
  sortOrder: number
  createdAt?: string
}

export interface AdminGalleryImage extends GalleryImage {
  isPublished: boolean
  createdBy?: { _id: string; name?: string } | null
  createdAt: string
  updatedAt: string
}

export interface AdminGalleryMeta {
  total: number
  published: number
  hidden: number
  max: number
}

/** The text in this language; an empty Bangla value falls back to English */
export function galleryText(text: Partial<GalleryText> | null | undefined, locale: Locale): string {
  const own = text?.[locale]?.trim()
  return own || text?.en?.trim() || ''
}

/**
 * A smaller copy of a Cloudinary image for thumbnails and grids (resized and
 * format-negotiated by Cloudinary). Other URLs are returned unchanged.
 */
export function galleryThumbUrl(url: string, width: number): string {
  const marker = '/image/upload/'
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url) || !url.includes(marker)) return url
  return url.replace(marker, `${marker}c_limit,w_${Math.round(width)},q_auto,f_auto/`)
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function getPublicGallery(signal?: AbortSignal): Promise<GalleryImage[]> {
  const res = await fetch(`${API_BASE_URL}/api/gallery`, { cache: 'no-store', signal })
  if (!res.ok) throw new Error('Failed to load the gallery')
  const body = await res.json().catch(() => ({}))
  return (body?.data ?? []) as GalleryImage[]
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function adminRequest<T>(path: string, init: RequestInit, fallback: string) {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  const res = await apiFetch(`${API_BASE_URL}/api/admin/gallery${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: init.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.errors?.[0]?.message || body?.message || fallback)
  return { message: (body?.message as string) || '', data: body?.data as T, meta: body?.meta }
}

export async function listAdminGallery() {
  const { data, meta } = await adminRequest<AdminGalleryImage[]>('', {}, 'Failed to load the gallery')
  return { images: data ?? [], meta: (meta ?? null) as AdminGalleryMeta | null }
}

/** Uploads one photo; it is added at the top of the gallery */
export function uploadGalleryImage(file: File, isPublished: boolean) {
  const form = new FormData()
  form.append('image', file)
  form.append('isPublished', String(isPublished))
  return adminRequest<AdminGalleryImage>('', { method: 'POST', body: form }, 'The photo could not be uploaded')
}

export function updateGalleryImage(
  id: string,
  input: { title?: Partial<GalleryText>; description?: Partial<GalleryText>; isPublished?: boolean },
) {
  return adminRequest<AdminGalleryImage>(`/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, 'Failed to save the photo')
}

/** Saves the display order; `order` is every image id, first to last */
export function reorderGallery(order: string[]) {
  return adminRequest<{ _id: string; sortOrder: number }[]>(
    '/order',
    { method: 'PUT', body: JSON.stringify({ order }) },
    'Failed to save the gallery order',
  )
}

export function deleteGalleryImage(id: string) {
  return adminRequest<undefined>(`/${id}`, { method: 'DELETE' }, 'Failed to delete the photo')
}
