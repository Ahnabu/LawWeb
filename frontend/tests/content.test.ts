import { describe, expect, it } from 'vitest'
import {
  buildStringOverrides,
  isLocalizedText,
  pickText,
  resolveDefaultItem,
  resolvePublishedItem,
  resolveString,
} from '../lib/content'
import { lookupTranslation, translate } from '../lib/i18n'

// Public-site resolution of CMS content (lib/content.ts)

describe('resolveString lookup order', () => {
  const key = 'about.heroTitle'
  const defEn = translate('en', key)
  const defBn = translate('bn', key)

  it('falls back to the i18n default without an override', () => {
    expect(resolveString('en', key, {})).toBe(defEn)
    expect(resolveString('bn', key, {})).toBe(defBn)
  })

  it('uses the override for its own language', () => {
    const overrides = { [key]: { en: 'New', bn: 'নতুন' } }
    expect(resolveString('en', key, overrides)).toBe('New')
    expect(resolveString('bn', key, overrides)).toBe('নতুন')
  })

  it('keeps the Bangla default when only English is overridden', () => {
    expect(resolveString('bn', key, { [key]: { en: 'New' } })).toBe(defBn)
  })

  it('ignores whitespace-only overrides', () => {
    expect(resolveString('en', key, { [key]: { en: '   ' } })).toBe(defEn)
  })

  it('falls back to the English override, then the key, for unknown keys', () => {
    expect(resolveString('bn', 'x.unknown', { 'x.unknown': { en: 'Only English' } })).toBe('Only English')
    expect(resolveString('en', 'x.unknown', {})).toBe('x.unknown')
  })

  it('ignores the Bangla fingerprint', () => {
    expect(resolveString('bn', key, { [key]: { bn: 'খ', bnFor: '0a1b2c3d' } })).toBe('খ')
  })
})

describe('buildStringOverrides', () => {
  it('merges pages in CONTENT_PAGE_KEYS order (later pages win)', () => {
    const merged = buildStringOverrides({
      blogs: { strings: { 'a.b': { en: 'blogs' } } },
      site: { strings: { 'a.b': { en: 'site' }, 'c.d': { en: 'site only' } } },
    })
    expect(merged['a.b'].en).toBe('blogs')
    expect(merged['c.d'].en).toBe('site only')
  })
})

describe('pickText', () => {
  it('falls back to English when Bangla is empty', () => {
    expect(pickText('bn', { en: 'E', bn: ' ' })).toBe('E')
    expect(pickText('bn', { en: 'E', bn: 'ব' })).toBe('ব')
    expect(pickText('en', { en: 'E', bn: 'ব' })).toBe('E')
    expect(pickText('en', undefined)).toBe('')
  })
})

describe('list items', () => {
  it('recognises localized text with or without a fingerprint', () => {
    expect(isLocalizedText({ en: 'a' })).toBe(true)
    expect(isLocalizedText({ en: 'a', bn: 'b', bnFor: '0a1b2c3d' })).toBe(true)
    expect(isLocalizedText({ en: 'a', title: 'x' })).toBe(false)
  })

  it('resolves default items through t()', () => {
    const item = resolveDefaultItem({ slug: 'family-law', titleKey: 'about.heroTitle' }, 0, (k) => `t:${k}`)
    expect(item).toEqual({ slug: 'family-law', title: 't:about.heroTitle', id: 'family-law' })
  })

  it('resolves published items per language', () => {
    const item = { year: { en: '1997', bn: '১৯৯৭', bnFor: '0a1b2c3d' }, title: { en: 'Founded', bn: '' } }
    expect(resolvePublishedItem(item, 2, 'bn')).toEqual({ year: '১৯৯৭', title: 'Founded', id: '2' })
  })

  it('resolves bare localized items to label, including fingerprinted ones', () => {
    expect(resolvePublishedItem({ en: 'Bar Council', bn: 'বার কাউন্সিল', bnFor: '0a1b2c3d' }, 0, 'bn')).toEqual({
      label: 'বার কাউন্সিল',
      id: '0',
    })
  })
})

describe('SEO defaults', () => {
  it.each(['home', 'about', 'practiceAreas', 'trackCase', 'blogs'])('seo.%s has a title and description in EN and BN', (page) => {
    for (const locale of ['en', 'bn'] as const) {
      expect(lookupTranslation(locale, `seo.${page}.title`)).toBeTruthy()
      expect(lookupTranslation(locale, `seo.${page}.description`)).toBeTruthy()
    }
  })
})
