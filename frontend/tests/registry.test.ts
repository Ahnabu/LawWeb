import { describe, expect, it } from 'vitest'
// The backend schema is the source of truth for the stored shape; the editor
// registry must produce data it accepts. Needs backend/node_modules installed.
import { CONTENT_PAGE_KEYS as BACKEND_PAGE_KEYS, contentPageSchemas } from '../../backend/src/config/contentSchemas'
import { CONTENT_PAGE_KEYS, resolveDefaultItem, resolvePublishedItem, type PageContent } from '../lib/content'
import { contentRegistry } from '../lib/contentRegistry'
import { cleanPageData, defaultListItems, fingerprint, stableStringify } from '../lib/adminContent'
import { lookupTranslation, translate } from '../lib/i18n'

const allTexts = contentRegistry.flatMap((page) => page.sections.flatMap((s) => (s.texts ?? []).map((f) => ({ page: page.key, key: f.key }))))
const allLists = contentRegistry.flatMap((page) => page.sections.flatMap((s) => (s.list ? [{ page: page.key, list: s.list }] : [])))

// Every text edited, every list filled from its defaults, settings set
function fullPageData(pageKey: string): PageContent {
  const page = contentRegistry.find((p) => p.key === pageKey)!
  const data: PageContent = { strings: {} }
  for (const section of page.sections) {
    for (const field of section.texts ?? []) {
      const en = `Edited ${field.key}`
      data.strings![field.key] = { en, bn: `সম্পাদিত ${field.key}`, bnFor: fingerprint(en) }
    }
    if (section.list) data[section.list.name] = defaultListItems(section.list)
    if (section.settings) {
      data.settings = {
        phone: '+880 1715-365380',
        phoneDisplay: '+880 1715 365 380',
        fax: '02-9876543',
        email: 'info@example.com',
        whatsappNumber: '8801715365380',
        socials: [{ platform: 'facebook', url: 'https://facebook.com/example' }],
      }
    }
  }
  return data
}

describe('registry mirrors the backend', () => {
  it('has the same page keys as the backend and lib/content', () => {
    expect(contentRegistry.map((p) => p.key).sort()).toEqual([...BACKEND_PAGE_KEYS].sort())
    expect([...CONTENT_PAGE_KEYS]).toEqual([...BACKEND_PAGE_KEYS])
  })

  it.each(contentRegistry.map((p) => [p.key]))('%s: full editor data passes the backend schema', (pageKey) => {
    const page = contentRegistry.find((p) => p.key === pageKey)!
    const cleaned = cleanPageData(page, fullPageData(pageKey))
    const parsed = contentPageSchemas[page.key].safeParse(cleaned)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
  })

  it.each(contentRegistry.map((p) => [p.key]))('%s: a server round-trip is not dirty', (pageKey) => {
    const page = contentRegistry.find((p) => p.key === pageKey)!
    const cleaned = cleanPageData(page, fullPageData(pageKey))
    const saved = contentPageSchemas[page.key].parse(cleaned) as PageContent
    expect(stableStringify(cleanPageData(page, saved))).toBe(stableStringify(cleaned))
  })

  it('rejects bad input the editor can produce', () => {
    const bad = (key: 'site' | 'practice-areas' | 'about', data: unknown) => contentPageSchemas[key].safeParse(data).success
    expect(bad('site', { settings: { whatsappNumber: '+8801715365380' } })).toBe(false)
    expect(bad('site', { settings: { socials: [{ platform: 'x', url: 'javascript:alert(1)' }] } })).toBe(false)
    const area = { slug: 'a', title: { en: 'T', bn: '' }, description: { en: 'D', bn: '' }, details: { en: 'X', bn: '' } }
    expect(bad('practice-areas', { areas: [area, area] })).toBe(false)
    expect(bad('about', { certifications: [{ en: '', bn: 'ক' }] })).toBe(false)
  })
})

describe('text fields', () => {
  it('each i18n key belongs to exactly one page', () => {
    const seen = new Map<string, string>()
    const duplicates = allTexts.filter(({ page, key }) => {
      const dup = seen.has(key)
      seen.set(key, page)
      return dup
    })
    expect(duplicates).toEqual([])
  })

  it('every key resolves in English and Bangla', () => {
    const missing = allTexts.flatMap(({ key }) =>
      (['en', 'bn'] as const).filter((l) => !lookupTranslation(l, key)).map((l) => `${l}:${key}`),
    )
    expect(missing).toEqual([])
  })

  it('no text key doubles as a list default key', () => {
    const listKeys = new Set(allLists.flatMap(({ list }) => list.defaults.flatMap((item) => Object.entries(item).filter(([f]) => f.endsWith('Key')).map(([, v]) => v))))
    expect(allTexts.filter(({ key }) => listKeys.has(key))).toEqual([])
  })
})

describe('lists', () => {
  it.each(allLists.map(({ page, list }) => [`${page}.${list.name}`, list] as const))(
    '%s: default items resolve in EN and BN, and match once published unchanged',
    (_, list) => {
      for (const locale of ['en', 'bn'] as const) {
        const t = (key: string) => translate(locale, key)
        const unresolved = list.defaults.flatMap((item) =>
          Object.entries(item).filter(([field, key]) => field.endsWith('Key') && !lookupTranslation(locale, key)),
        )
        expect(unresolved).toEqual([])
        const fromDefaults = list.defaults.map((item, i) => resolveDefaultItem(item, i, t))
        // `id` is only a React key (defaults may have their own; stored items use the index)
        const withoutId = ({ id: _id, ...rest }: Record<string, string>) => rest
        const published = defaultListItems(list).map((item, i) => resolvePublishedItem(item, i, locale))
        // Bare { en, bn } lists render as `label`; the defaults' `labelKey` resolves to the same field
        expect(published.map(withoutId)).toEqual(fromDefaults.map(withoutId))
      }
    },
  )
})
