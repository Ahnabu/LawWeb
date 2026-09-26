import { API_BASE_URL } from './api'
import type { ContentPageKey, PageContent, SiteSettingsOverride, StringOverride } from './content'
import type { ContentPageDef, ListDef } from './contentRegistry'
import { lookupTranslation } from './i18n'
import { apiFetch } from './http'

// ── Admin CMS API (/api/admin/content) ────────────────────────────────────────

export interface AdminContentPage {
  key: ContentPageKey
  draft: PageContent
  published?: PageContent
  version: number
  hasUnpublishedChanges: boolean
  draftUpdatedAt: string | null
  draftUpdatedByName: string | null
  publishedAt: string | null
  publishedByName: string | null
}

export interface FieldError {
  field: string
  message: string
}

export class ContentSaveError extends Error {
  errors: FieldError[]

  constructor(message: string, errors: FieldError[] = []) {
    super(message)
    this.errors = errors
  }
}

const contentUrl = (path = '') => `${API_BASE_URL}/api/admin/content${path}`

async function request<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const res = await apiFetch(url, { credentials: 'include', ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ContentSaveError(data.message || fallbackMessage, data.errors ?? [])
  return data.data as T
}

export function getAdminContentPages(): Promise<AdminContentPage[]> {
  return request(contentUrl(), { cache: 'no-store' }, 'Failed to fetch content pages')
}

export function getAdminContentPage(key: ContentPageKey): Promise<AdminContentPage> {
  return request(contentUrl(`/${key}`), { cache: 'no-store' }, 'Failed to fetch page content')
}

export function saveContentDraft(key: ContentPageKey, data: PageContent): Promise<AdminContentPage> {
  return request(
    contentUrl(`/${key}`),
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) },
    'Failed to save draft',
  )
}

export function publishContentPage(key: ContentPageKey): Promise<AdminContentPage> {
  return request(contentUrl(`/${key}/publish`), { method: 'POST' }, 'Failed to publish page')
}

export function discardContentDraft(key: ContentPageKey): Promise<AdminContentPage> {
  return request(contentUrl(`/${key}/discard`), { method: 'POST' }, 'Failed to discard changes')
}

export interface ContentRevisionSummary {
  _id: string
  version: number
  publishedByName?: string
  createdAt: string
}

export interface ContentRevisionDetail extends ContentRevisionSummary {
  data: PageContent
}

export function getContentRevisions(key: ContentPageKey): Promise<ContentRevisionSummary[]> {
  return request(contentUrl(`/${key}/revisions`), { cache: 'no-store' }, 'Failed to fetch history')
}

export function getContentRevision(key: ContentPageKey, version: number): Promise<ContentRevisionDetail> {
  return request(contentUrl(`/${key}/revisions/${version}`), { cache: 'no-store' }, 'Failed to fetch version')
}

export function restoreContentRevision(key: ContentPageKey, version: number): Promise<AdminContentPage> {
  return request(contentUrl(`/${key}/revisions/${version}/restore`), { method: 'POST' }, 'Failed to restore version')
}

// ── Editor helpers ────────────────────────────────────────────────────────────

// bnFor: fingerprint of the English the Bangla was written for (see below)
export type LocalizedValue = { en: string; bn: string; bnFor?: string }
export type ListItem = LocalizedValue | Record<string, LocalizedValue | string>

export const defaultText = (key: string): LocalizedValue => ({
  en: lookupTranslation('en', key) ?? '',
  bn: lookupTranslation('bn', key) ?? '',
})

// ── Stale Bangla detection ────────────────────────────────────────────────────
// When Bangla is typed, the editor stores `bnFor` = fingerprint of the English
// at that moment. If the English is edited later, the fingerprints differ and
// the Bangla is flagged as outdated until it is updated or marked up to date.

// FNV-1a 32-bit, 8 hex chars; only needs to detect edits, not resist attacks
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (const char of text.trim()) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const isBanglaOutdated = (value: Partial<LocalizedValue> | undefined): boolean =>
  !!value?.bn?.trim() && !!value.bnFor && value.bnFor !== fingerprint(value.en ?? '')

// A default value's Bangla was written for its default English
const withFingerprint = (value: LocalizedValue): LocalizedValue =>
  value.bn ? { ...value, bnFor: fingerprint(value.en) } : value

// Default list from lib/data.ts, in the shape the CMS stores. Editing it and
// saving stores the whole list, which then replaces the default on the site.
export function defaultListItems(list: ListDef): ListItem[] {
  return list.defaults.map((item) => {
    if (!list.fields) return withFingerprint(defaultText(item.labelKey))
    const out: Record<string, LocalizedValue | string> = {}
    for (const field of list.fields) {
      out[field.name] =
        field.type === 'localized' ? withFingerprint(defaultText(item[`${field.name}Key`])) : item[field.name] ?? ''
    }
    return out
  })
}

export function emptyListItem(list: ListDef): ListItem {
  if (!list.fields) return { en: '', bn: '' }
  return Object.fromEntries(
    list.fields.map((field) => [field.name, field.type === 'localized' ? { en: '', bn: '' } : '']),
  )
}

export function getListItems(data: PageContent, list: ListDef): { items: ListItem[]; customized: boolean } {
  const stored = data[list.name]
  return Array.isArray(stored)
    ? { items: stored as ListItem[], customized: true }
    : { items: defaultListItems(list), customized: false }
}

const trimLocalized = (value: unknown): LocalizedValue => {
  const v = (value ?? {}) as Partial<LocalizedValue>
  const out: LocalizedValue = { en: (v.en ?? '').trim(), bn: (v.bn ?? '').trim() }
  if (out.bn && v.bnFor) out.bnFor = v.bnFor
  return out
}

// Sparse data for saving: text equal to its default is dropped (so a later
// change to the code default still shows), and empty settings are removed.
export function cleanPageData(page: ContentPageDef, data: PageContent): PageContent {
  const out: PageContent = {}

  const strings: Record<string, StringOverride> = {}
  for (const [key, value] of Object.entries(data.strings ?? {})) {
    const def = defaultText(key)
    const en = (value.en ?? '').trim()
    const bn = (value.bn ?? '').trim()
    const override: StringOverride = {}
    if (en && en !== def.en) override.en = en
    if (bn && bn !== def.bn) override.bn = bn
    // Kept with an English-only override too: it confirms the default Bangla still fits
    if ((override.en || override.bn) && value.bnFor) override.bnFor = value.bnFor
    if (override.en || override.bn) strings[key] = override
  }
  if (Object.keys(strings).length) out.strings = strings

  if (page.sections.some((s) => s.settings) && data.settings) {
    const source = data.settings as SiteSettingsOverride
    const settings: SiteSettingsOverride = {}
    for (const field of ['phone', 'phoneDisplay', 'fax', 'email', 'whatsappNumber'] as const) {
      const value = source[field]?.trim()
      if (value) settings[field] = value
    }
    if (source.socials) settings.socials = source.socials.map((s) => ({ platform: s.platform, url: s.url.trim() }))
    if (Object.keys(settings).length) out.settings = settings
  }

  for (const field of page.sections.flatMap((s) => s.images ?? [])) {
    const value = typeof data[field.name] === 'string' ? (data[field.name] as string).trim() : ''
    if (value) out[field.name] = value
  }

  for (const section of page.sections) {
    const list = section.list
    if (!list || !Array.isArray(data[list.name])) continue
    out[list.name] = (data[list.name] as ListItem[]).map((item) => {
      if (!list.fields) return trimLocalized(item)
      const record = item as Record<string, unknown>
      return Object.fromEntries(
        list.fields.map((field) => [
          field.name,
          field.type === 'localized' ? trimLocalized(record[field.name]) : String(record[field.name] ?? '').trim(),
        ]),
      )
    })
  }

  return out
}

// Key-order-independent JSON, for comparing the editor state with the saved draft
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// ── Bangla completeness ───────────────────────────────────────────────────────
// missing:  a text's English was changed but its Bangla is still the default
//           (the Bangla site shows the old text) and nobody confirmed that the
//           default still fits, or a list item has English but no Bangla (the
//           Bangla site shows English).
// outdated: custom Bangla whose English was edited after it was written.

export type BanglaState = 'ok' | 'missing' | 'outdated'

export function textBanglaState(key: string, override: StringOverride | undefined): BanglaState {
  const def = defaultText(key)
  const en = override?.en?.trim() || def.en
  const bn = override?.bn?.trim()
  // Default Bangla is fine for the default English, or once confirmed for this English
  if (!bn || bn === def.bn) return en === def.en || override?.bnFor === fingerprint(en) ? 'ok' : 'missing'
  return isBanglaOutdated({ en, bn, bnFor: override?.bnFor }) ? 'outdated' : 'ok'
}

export function itemBanglaState(value: Partial<LocalizedValue> | undefined): BanglaState {
  if (value?.en?.trim() && !value.bn?.trim()) return 'missing'
  return isBanglaOutdated(value) ? 'outdated' : 'ok'
}

export function banglaStatus(page: ContentPageDef, data: PageContent) {
  let total = 0
  let missing = 0
  let outdated = 0
  const count = (state: BanglaState) => {
    total++
    if (state === 'missing') missing++
    if (state === 'outdated') outdated++
  }

  for (const section of page.sections) {
    for (const field of section.texts ?? []) count(textBanglaState(field.key, data.strings?.[field.key]))

    const list = section.list
    if (!list) continue
    const { items } = getListItems(data, list)
    for (const item of items) {
      const values = list.fields
        ? list.fields.filter((f) => f.type === 'localized').map((f) => (item as Record<string, LocalizedValue>)[f.name])
        : [item as LocalizedValue]
      for (const value of values) count(itemBanglaState(value))
    }
  }

  const done = total - missing - outdated
  return { total, missing, outdated, percent: total ? Math.round((done / total) * 100) : 100 }
}

// ── Revision compare ──────────────────────────────────────────────────────────
// Labels of what differs between two versions of a page (bnFor is ignored).

const localizedEqual = (a: Partial<LocalizedValue> | undefined, b: Partial<LocalizedValue> | undefined) =>
  (a?.en ?? '').trim() === (b?.en ?? '').trim() && (a?.bn ?? '').trim() === (b?.bn ?? '').trim()

const stripFingerprints = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripFingerprints)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== 'bnFor')
        .map(([k, v]) => [k, stripFingerprints(v)]),
    )
  }
  return value
}

const SETTINGS_LABELS = {
  phone: 'Phone number',
  phoneDisplay: 'Phone (as displayed)',
  fax: 'Fax',
  email: 'Email',
  whatsappNumber: 'WhatsApp number',
} as const

export function diffPageData(page: ContentPageDef, a: PageContent, b: PageContent): string[] {
  const changes: string[] = []

  for (const section of page.sections) {
    for (const field of section.texts ?? []) {
      if (!localizedEqual(a.strings?.[field.key], b.strings?.[field.key])) changes.push(`${section.title} › ${field.label}`)
    }

    for (const field of section.images ?? []) {
      if ((a[field.name] ?? '') !== (b[field.name] ?? '')) changes.push(`${section.title} › ${field.label}`)
    }

    if (section.settings) {
      const sa = (a.settings ?? {}) as SiteSettingsOverride
      const sb = (b.settings ?? {}) as SiteSettingsOverride
      for (const [field, label] of Object.entries(SETTINGS_LABELS) as [keyof typeof SETTINGS_LABELS, string][]) {
        if ((sa[field] ?? '') !== (sb[field] ?? '')) changes.push(`${section.title} › ${label}`)
      }
      if (stableStringify(sa.socials ?? null) !== stableStringify(sb.socials ?? null)) {
        changes.push(`${section.title} › Social links`)
      }
    }

    const list = section.list
    if (list && stableStringify(stripFingerprints(a[list.name] ?? null)) !== stableStringify(stripFingerprints(b[list.name] ?? null))) {
      changes.push(`${section.title} › ${list.label}`)
    }
  }

  return changes
}

// "successStories.1.title.en" → "Stories › Story 2 › Title (English)"
export function describeFieldPath(page: ContentPageDef, path: string): string {
  const parts = path.split('.')
  const lang = (p?: string) => (p === 'en' ? ' (English)' : p === 'bn' ? ' (Bangla)' : '')

  if (parts[0] === 'strings') {
    const key = parts.slice(1, -1).join('.')
    const field = page.sections.flatMap((s) => s.texts ?? []).find((f) => f.key === key)
    return `${field?.label ?? key}${lang(parts[parts.length - 1])}`
  }
  if (parts[0] === 'settings') return `Contact details › ${parts.slice(1).join(' › ')}`

  const image = page.sections.flatMap((s) => s.images ?? []).find((f) => f.name === parts[0])
  if (image) return image.label

  const list = page.sections.map((s) => s.list).find((l) => l?.name === parts[0])
  if (!list) return path
  if (parts.length === 1) return list.label
  const itemLabel = `${list.itemLabel} ${Number(parts[1]) + 1}`
  if (!list.fields) return `${list.label} › ${itemLabel}${lang(parts[2])}`
  const field = list.fields.find((f) => f.name === parts[2])
  return `${list.label} › ${itemLabel} › ${field?.label ?? parts[2]}${lang(parts[3])}`
}
