import { describe, expect, it } from 'vitest'
import { buildMetadata, DEFAULT_OG_IMAGE } from '../lib/seo'

// Page metadata (lib/seo.ts): canonical, hreflang and social tags.
// Passing overrides ({}) keeps these tests off the network.

const base = { title: 'T', description: 'D' }

describe('buildMetadata', () => {
  it('gives bilingual pages a canonical URL and hreflang alternates', async () => {
    const meta = await buildMetadata({ ...base, path: '/about', locale: 'bn' }, {})
    expect(meta.alternates).toEqual({
      canonical: '/bn/about',
      languages: { en: '/about', bn: '/bn/about', 'x-default': '/about' },
    })
    expect(meta.openGraph).toMatchObject({ url: '/bn/about', locale: 'bn_BD', alternateLocale: 'en_US' })
  })

  it('gives single-language pages a canonical URL without hreflang', async () => {
    const meta = await buildMetadata({ ...base, path: '/lawyers' }, {})
    expect(meta.alternates).toEqual({ canonical: '/lawyers' })
    expect(meta.openGraph).not.toHaveProperty('alternateLocale')
  })

  it('points both languages of an untranslated page at the English URL', async () => {
    const meta = await buildMetadata({ ...base, path: '/blogs/a-post', locale: 'bn', singleUrl: true }, {})
    expect(meta.alternates).toEqual({ canonical: '/blogs/a-post' })
    expect(meta.openGraph).toMatchObject({ url: '/blogs/a-post', locale: 'bn_BD' })
  })

  it('leaves out canonical tags without a path', async () => {
    const meta = await buildMetadata(base, {})
    expect(meta.alternates).toBeUndefined()
  })

  it('always sets a share image and a large Twitter card', async () => {
    const meta = await buildMetadata(base, {})
    expect(meta.openGraph).toMatchObject({ images: [DEFAULT_OG_IMAGE], siteName: 'Islam & Associates' })
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [DEFAULT_OG_IMAGE.url] })
  })

  it('adds article dates for blog posts', async () => {
    const meta = await buildMetadata(
      { ...base, type: 'article', article: { publishedTime: '2026-01-01T00:00:00.000Z' } },
      {},
    )
    expect(meta.openGraph).toMatchObject({ type: 'article', publishedTime: '2026-01-01T00:00:00.000Z' })
  })
})
