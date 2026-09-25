import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getRouteLocale, languageAlternates, localizePath } from '../lib/locale'
import { SEO_PAGE_PATHS } from '../lib/seo'

// Locale URLs (lib/locale.ts): /about is English, /bn/about is Bangla

describe('getRouteLocale', () => {
  it('reads the language from localized paths', () => {
    expect(getRouteLocale('/')).toBe('en')
    expect(getRouteLocale('/about')).toBe('en')
    expect(getRouteLocale('/blogs/some-post')).toBe('en')
    expect(getRouteLocale('/bn')).toBe('bn')
    expect(getRouteLocale('/bn/')).toBe('bn')
    expect(getRouteLocale('/bn/practice-areas')).toBe('bn')
    expect(getRouteLocale('/bn/blogs/some-post')).toBe('bn')
  })

  it('returns null for single-language routes', () => {
    for (const path of ['/dashboard/admin', '/login', '/lawyers', '/lawyers/1', '/bn/dashboard', '/bnx', '/aboutus', '/blogsx']) {
      expect(getRouteLocale(path)).toBeNull()
    }
  })
})

describe('localizePath', () => {
  it('adds and removes the /bn prefix', () => {
    expect(localizePath('/', 'bn')).toBe('/bn')
    expect(localizePath('/about', 'bn')).toBe('/bn/about')
    expect(localizePath('/bn/about', 'en')).toBe('/about')
    expect(localizePath('/bn', 'en')).toBe('/')
    expect(localizePath('/bn/about', 'bn')).toBe('/bn/about')
    expect(localizePath('/about', 'en')).toBe('/about')
  })

  it('keeps the query and hash', () => {
    expect(localizePath('/#contact', 'bn')).toBe('/bn#contact')
    expect(localizePath('/bn#contact', 'en')).toBe('/#contact')
    expect(localizePath('/about?preview=1', 'bn')).toBe('/bn/about?preview=1')
    expect(localizePath('/bn/blogs/x?a=1#top', 'en')).toBe('/blogs/x?a=1#top')
  })

  it('leaves single-language routes alone', () => {
    expect(localizePath('/lawyers', 'bn')).toBe('/lawyers')
    expect(localizePath('/dashboard/client/appointment', 'bn')).toBe('/dashboard/client/appointment')
  })

  it('builds hreflang alternates', () => {
    expect(languageAlternates('/about')).toEqual({ en: '/about', bn: '/bn/about', 'x-default': '/about' })
  })
})

describe('app/bn mirrors the localized routes', () => {
  const appDir = join(__dirname, '..', 'app')
  const pageExists = (dir: string) => {
    try {
      return statSync(join(dir, 'page.tsx')).isFile()
    } catch {
      return false
    }
  }

  it('has a /bn page for every SEO page and the blog article', () => {
    for (const path of [...Object.values(SEO_PAGE_PATHS), '/blogs/[slug]']) {
      expect(pageExists(join(appDir, 'bn', path)), `app/bn${path}`).toBe(true)
    }
  })

  it('has no /bn page that the locale helpers do not know about', () => {
    const walk = (dir: string, route: string): string[] => [
      ...(pageExists(dir) ? [route || '/'] : []),
      ...readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => walk(join(dir, entry.name), `${route}/${entry.name}`)),
    ]
    for (const route of walk(join(appDir, 'bn'), '')) {
      const sample = route.replace('[slug]', 'sample')
      expect(getRouteLocale(sample), route).toBe('en')
      expect(getRouteLocale(localizePath(sample, 'bn')), route).toBe('bn')
    }
  })
})
