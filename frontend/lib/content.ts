import { API_BASE_URL } from './api'
import { lookupTranslation, type Locale } from './i18n'

// ── CMS content (published) ─────────────────────────────────────────────────
// Mirrors backend/src/config/contentSchemas.ts. Content is sparse: a page,
// string or list that is absent falls back to the code defaults in i18n.ts,
// data.ts and siteConfig.ts, so an empty response renders the static site.

export const CONTENT_PAGE_KEYS = [
  'site',
  'global',
  'home',
  'about',
  'practice-areas',
  'track-case',
  'blogs',
] as const

export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[number]

// `bnFor` is an admin-editor fingerprint of the English the Bangla was
// written for (stale-translation flag); the public site ignores it.
export interface LocalizedText {
  en: string
  bn?: string
  bnFor?: string
}

export interface StringOverride {
  en?: string
  bn?: string
  bnFor?: string
}

export type StringOverrides = Record<string, StringOverride>

export interface SocialLink {
  platform: 'facebook' | 'linkedin' | 'youtube' | 'x' | 'instagram'
  url: string
}

export interface SiteSettingsOverride {
  phone?: string
  phoneDisplay?: string
  fax?: string
  email?: string
  whatsappNumber?: string
  socials?: SocialLink[]
}

// Each page: optional `strings` plus page-specific lists (see contentSchemas.ts)
export type PageContent = { strings?: StringOverrides } & Record<string, unknown>

export type PublishedContent = Partial<Record<ContentPageKey, PageContent>>

export const CONTENT_REVALIDATE_SECONDS = 300
export const CONTENT_CACHE_TAG = 'content'

// Server-only: called from the root layout. Uses the Next data cache, so the
// backend sees at most one request per revalidate window (plus on-demand
// revalidation after a publish), not one per page view.
export async function getPublishedContent(): Promise<PublishedContent> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/content`, {
      next: { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_CACHE_TAG] },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return {}
    const body = await res.json()
    return body && typeof body.data === 'object' && body.data !== null ? body.data : {}
  } catch {
    // Backend down or unreachable: the site renders from code defaults
    return {}
  }
}

// Merge every page's string overrides into one map, in CONTENT_PAGE_KEYS order
export function buildStringOverrides(content: PublishedContent): StringOverrides {
  const merged: StringOverrides = {}
  for (const pageKey of CONTENT_PAGE_KEYS) {
    const strings = content[pageKey]?.strings
    if (strings && typeof strings === 'object') Object.assign(merged, strings)
  }
  return merged
}

// Text lookup for t(): override[locale] → default[locale] → override.en → default.en → key
export function resolveString(locale: Locale, key: string, overrides: StringOverrides): string {
  const override = overrides[key]
  return (
    override?.[locale]?.trim() ||
    lookupTranslation(locale, key) ||
    override?.en?.trim() ||
    lookupTranslation('en', key) ||
    key
  )
}

// Bangla falls back to English when empty
export function pickText(locale: Locale, value: LocalizedText | StringOverride | undefined): string {
  if (!value) return ''
  return (locale === 'bn' && value.bn?.trim() ? value.bn : value.en) ?? ''
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as LocalizedText).en === 'string' &&
    Object.keys(value).every((k) => k === 'en' || k === 'bn' || k === 'bnFor')
  )
}

// A default item from lib/data.ts with `fooKey` fields resolves to `foo`.
// A published CMS item with `foo: { en, bn }` resolves to the same `foo`, so
// both sources share one render shape. Plain string fields pass through.
export type ResolvedItem<T> = {
  [K in keyof T as K extends `${infer Base}Key` ? Base : K]: string
} & { id: string }

export type DefaultItem = Record<string, string>

export function resolveDefaultItem(item: DefaultItem, index: number, t: (key: string) => string) {
  const out: Record<string, string> = {}
  for (const [field, value] of Object.entries(item)) {
    if (field.endsWith('Key') && field.length > 3) out[field.slice(0, -3)] = t(value)
    else out[field] = value
  }
  out.id = item.id ?? item.slug ?? String(index)
  return out
}

export function resolvePublishedItem(item: unknown, index: number, locale: Locale) {
  const out: Record<string, string> = {}
  // Lists of bare localized text (e.g. about.certifications) resolve to `label`
  if (isLocalizedText(item)) {
    out.label = pickText(locale, item)
  } else if (item && typeof item === 'object') {
    for (const [field, value] of Object.entries(item)) {
      if (isLocalizedText(value)) out[field] = pickText(locale, value)
      else if (typeof value === 'string') out[field] = value
    }
  }
  out.id = out.id ?? out.slug ?? String(index)
  return out
}
