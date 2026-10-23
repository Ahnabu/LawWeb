import { describe, expect, it } from 'vitest'
import {
  banglaStatus,
  cleanPageData,
  defaultListItems,
  defaultText,
  describeFieldPath,
  diffPageData,
  emptyListItem,
  fingerprint,
  getListItems,
  isBanglaOutdated,
  itemBanglaState,
  textBanglaState,
  type ListItemValue,
  type LocalizedValue,
} from '../lib/adminContent'
import { getPageDef, type ListDef } from '../lib/contentRegistry'
import { generations } from '../lib/data'

// Admin editor helpers (lib/adminContent.ts)

const about = getPageDef('about')!
const site = getPageDef('site')!
const listOf = (name: string) => about.sections.map((s) => s.list).find((l) => l?.name === name) as ListDef
const KEY = 'about.principal.name'
const def = defaultText(KEY)

describe('fingerprint', () => {
  it('is 8 hex chars, stable, and ignores surrounding whitespace', () => {
    expect(fingerprint('Hello')).toMatch(/^[0-9a-f]{8}$/)
    expect(fingerprint(' Hello ')).toBe(fingerprint('Hello'))
    expect(fingerprint('Hello')).not.toBe(fingerprint('Hello!'))
    expect(fingerprint('বাংলা')).not.toBe(fingerprint('বাংল'))
  })
})

describe('cleanPageData (sparse storage)', () => {
  it('drops text equal to the default', () => {
    expect(cleanPageData(about, { strings: { [KEY]: { en: def.en, bn: def.bn } } })).toEqual({})
  })

  it('keeps only the changed language, trimmed', () => {
    expect(cleanPageData(about, { strings: { [KEY]: { en: '  New  ', bn: def.bn } } })).toEqual({
      strings: { [KEY]: { en: 'New' } },
    })
  })

  it('keeps bnFor with a kept override and drops it otherwise', () => {
    const bnFor = fingerprint('New')
    expect(cleanPageData(about, { strings: { [KEY]: { en: 'New', bn: 'নতুন', bnFor } } }).strings?.[KEY]).toEqual({
      en: 'New',
      bn: 'নতুন',
      bnFor,
    })
    // English-only override: bnFor confirms the default Bangla still fits
    expect(cleanPageData(about, { strings: { [KEY]: { en: 'New', bn: def.bn, bnFor } } }).strings?.[KEY]).toEqual({ en: 'New', bnFor })
    // Nothing overridden: nothing stored
    expect(cleanPageData(about, { strings: { [KEY]: { en: def.en, bn: def.bn, bnFor } } })).toEqual({})
  })

  it('keeps list fingerprints only when there is Bangla', () => {
    const cleaned = cleanPageData(about, {
      certifications: [
        { en: ' A ', bn: 'ক', bnFor: 'aaaaaaaa' },
        { en: 'B', bn: '', bnFor: 'bbbbbbbb' },
      ],
    })
    expect(cleaned.certifications).toEqual([
      { en: 'A', bn: 'ক', bnFor: 'aaaaaaaa' },
      { en: 'B', bn: '' },
    ])
  })

  it('removes empty contact settings', () => {
    expect(cleanPageData(site, { settings: { phone: ' ', email: ' a@b.co ' } })).toEqual({ settings: { email: 'a@b.co' } })
  })

  it('trims photos and fills missing fields of list items', () => {
    const cleaned = cleanPageData(about, {
      generations: [{ name: { en: 'N', bn: '' }, photo: ' /about/gen-1.webp ' }],
    })
    const empty = { en: '', bn: '' }
    expect(cleaned.generations).toEqual([
      {
        era: empty,
        name: { en: 'N', bn: '' },
        relation: empty,
        note: empty,
        achievements: empty,
        photo: '/about/gen-1.webp',
      },
    ])
  })
})

describe('list defaults with photos', () => {
  it('copies default photos and leaves optional text without a default empty', () => {
    const [first, , third] = defaultListItems(listOf('generations')) as Record<string, ListItemValue>[]
    expect(first.note).toEqual({ en: '', bn: '' })
    expect((third.note as LocalizedValue).en).not.toBe('')
    expect(third.photo).toBe(generations[2].photo)
  })

  it('starts new items without a photo', () => {
    expect(emptyListItem(listOf('generations'))).toMatchObject({ photo: '', note: { en: '', bn: '' } })
  })
})

describe('Bangla status', () => {
  it('text: ok by default', () => {
    expect(textBanglaState(KEY, undefined)).toBe('ok')
  })

  it('text: missing when English changed but Bangla is the default', () => {
    expect(textBanglaState(KEY, { en: 'New' })).toBe('missing')
  })

  it('text: ok once the default Bangla is confirmed for the new English', () => {
    expect(textBanglaState(KEY, { en: 'New', bnFor: fingerprint('New') })).toBe('ok')
    expect(textBanglaState(KEY, { en: 'Newer', bnFor: fingerprint('New') })).toBe('missing')
  })

  it('text: outdated when English changed after custom Bangla was written', () => {
    expect(textBanglaState(KEY, { en: 'New', bn: 'নতুন', bnFor: fingerprint('New') })).toBe('ok')
    expect(textBanglaState(KEY, { en: 'Newer', bn: 'নতুন', bnFor: fingerprint('New') })).toBe('outdated')
    // Custom Bangla written against the default English, then English changed
    expect(textBanglaState(KEY, { en: 'New', bn: 'নতুন', bnFor: fingerprint(def.en) })).toBe('outdated')
  })

  it('text: legacy overrides without a fingerprint are never outdated', () => {
    expect(textBanglaState(KEY, { en: 'New', bn: 'নতুন' })).toBe('ok')
  })

  it('list items: missing without Bangla, outdated on fingerprint mismatch', () => {
    expect(itemBanglaState({ en: 'A', bn: '' })).toBe('missing')
    expect(itemBanglaState({ en: 'A', bn: 'ক', bnFor: fingerprint('A') })).toBe('ok')
    expect(itemBanglaState({ en: 'A2', bn: 'ক', bnFor: fingerprint('A') })).toBe('outdated')
    expect(isBanglaOutdated({ en: 'A2', bn: '', bnFor: fingerprint('A') })).toBe(false)
  })

  it('default lists carry fingerprints and count as complete', () => {
    const items = defaultListItems(listOf('principalCareer')) as Record<string, LocalizedValue>[]
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      for (const value of Object.values(item)) expect(itemBanglaState(value)).toBe('ok')
    }
    expect(banglaStatus(about, {})).toMatchObject({ missing: 0, outdated: 0, percent: 100 })
  })

  it('counts missing and outdated separately', () => {
    const { items } = getListItems({}, listOf('certifications'))
    const edited = items.map((item, i) => (i === 0 ? { ...(item as LocalizedValue), en: 'Changed' } : item))
    const status = banglaStatus(about, { strings: { [KEY]: { en: 'New' } }, certifications: edited })
    expect(status.missing).toBe(1)
    expect(status.outdated).toBe(1)
    expect(status.percent).toBeLessThan(100)
  })
})

describe('diffPageData', () => {
  it('lists changed texts and lists by label, ignoring fingerprints', () => {
    const a = { strings: { [KEY]: { en: 'Old' } }, certifications: [{ en: 'A', bn: 'ক', bnFor: 'aaaaaaaa' }] }
    const b = { strings: { [KEY]: { en: 'New' } }, certifications: [{ en: 'A', bn: 'ক', bnFor: 'bbbbbbbb' }] }
    expect(diffPageData(about, a, b)).toEqual(['Principal: introduction › Name'])
    expect(diffPageData(about, a, a)).toEqual([])
    expect(diffPageData(about, a, { ...a, certifications: [] })).toEqual(['Certifications & affiliations › Certifications'])
  })

  it('lists changed contact settings', () => {
    expect(diffPageData(site, { settings: { phone: '1' } }, { settings: { phone: '2', socials: [] } })).toEqual([
      'Contact details › Phone number',
      'Contact details › Social links',
    ])
  })
})

describe('describeFieldPath', () => {
  it('turns server error paths into editor labels', () => {
    expect(describeFieldPath(about, `strings.${KEY}.en`)).toBe('Name (English)')
    expect(describeFieldPath(about, 'generations.1.name.bn')).toBe('Generations › Generation 2 › Name (Bangla)')
    expect(describeFieldPath(about, 'generations.0.photo')).toBe('Generations › Generation 1 › Photo')
    expect(describeFieldPath(about, 'certifications.0.en')).toBe('Certifications › Certification 1 (English)')
  })
})
