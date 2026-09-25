import type { Locale } from './i18n'

// ── Locale URLs ───────────────────────────────────────────────────────────────
// The public CMS pages exist twice: English at the plain path (/about) and
// Bangla under /bn (/bn/about). On those pages the URL decides the language.
// Every other route (dashboard, login, lawyers, ...) has one URL and keeps
// using the stored preference. Pure functions: used by the LanguageProvider,
// metadata, the sitemap and the tests.

export const BN_PREFIX = '/bn'

// Plain (English) paths that also exist under /bn. Keep in sync with app/bn/.
const LOCALIZED_PATHS = ['/', '/about', '/practice-areas', '/track-case', '/blogs']
const LOCALIZED_PREFIXES = ['/blogs/']

function isLocalizedBasePath(path: string): boolean {
  return LOCALIZED_PATHS.includes(path) || LOCALIZED_PREFIXES.some((p) => path.startsWith(p))
}

function trimTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

/** Splits `/bn/about` into `{ locale: 'bn', basePath: '/about' }`. */
function splitLocale(pathname: string): { locale: Locale; basePath: string } {
  const path = trimTrailingSlash(pathname || '/')
  if (path === BN_PREFIX) return { locale: 'bn', basePath: '/' }
  if (path.startsWith(`${BN_PREFIX}/`)) return { locale: 'bn', basePath: path.slice(BN_PREFIX.length) }
  return { locale: 'en', basePath: path }
}

/**
 * The language a pathname fixes, or `null` when the route has a single URL
 * (the stored preference applies there).
 */
export function getRouteLocale(pathname: string): Locale | null {
  const { locale, basePath } = splitLocale(pathname)
  return isLocalizedBasePath(basePath) ? locale : null
}

/** A path in the given language: `('/about', 'bn')` → `/bn/about`. */
export function localizePath(path: string, locale: Locale): string {
  // Keep any ?query or #hash as-is
  const match = /^([^?#]*)(.*)$/.exec(path)
  const pathname = match?.[1] || '/'
  const suffix = match?.[2] ?? ''
  const { basePath } = splitLocale(pathname)

  if (!isLocalizedBasePath(basePath)) return path
  if (locale === 'en') return `${basePath}${suffix}`
  return `${basePath === '/' ? BN_PREFIX : `${BN_PREFIX}${basePath}`}${suffix}`
}

// ── Absolute URLs (metadata, sitemap) ─────────────────────────────────────────

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

/** `hreflang` alternates for a plain path, relative to `metadataBase`. */
export function languageAlternates(path: string) {
  return {
    en: localizePath(path, 'en'),
    bn: localizePath(path, 'bn'),
    'x-default': localizePath(path, 'en'),
  }
}
