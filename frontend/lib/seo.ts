import type { Metadata } from 'next'
import { buildStringOverrides, getPublishedContent, resolveString } from './content'
import type { Locale } from './i18n'
import { languageAlternates, localizePath } from './locale'

// ── Per-page SEO (CMS-editable) ───────────────────────────────────────────────
// Title and description come from the `seo.<page>.*` i18n keys, so admins edit
// them like any other text and an empty CMS falls back to i18n.ts. The language
// comes from the route (/about → English, /bn/about → Bangla).

export type SeoPageKey = 'home' | 'about' | 'practiceAreas' | 'trackCase' | 'blogs'

export const SEO_PAGE_PATHS: Record<SeoPageKey, string> = {
  home: '/',
  about: '/about',
  practiceAreas: '/practice-areas',
  trackCase: '/track-case',
  blogs: '/blogs',
}

const OG_LOCALES: Record<Locale, string> = { en: 'en_US', bn: 'bn_BD' }

/**
 * Metadata for a public page. With `path` (the plain English path) it also
 * sets the canonical URL and the `hreflang` alternates; the root layout omits
 * it so those tags don't leak onto dashboard and other single-language routes.
 */
export async function getPageMetadata(page: SeoPageKey, locale: Locale = 'en', path?: string): Promise<Metadata> {
  // Same cached fetch as the root layout, so this adds no backend request
  const overrides = buildStringOverrides(await getPublishedContent())
  const title = resolveString(locale, `seo.${page}.title`, overrides)
  const description = resolveString(locale, `seo.${page}.description`, overrides)

  const metadata: Metadata = {
    title,
    description,
    openGraph: { title, description, type: 'website', locale: OG_LOCALES[locale] },
  }

  if (path !== undefined) {
    const url = localizePath(path, locale)
    metadata.alternates = { canonical: url, languages: languageAlternates(path) }
    metadata.openGraph = {
      ...metadata.openGraph,
      url,
      alternateLocale: OG_LOCALES[locale === 'en' ? 'bn' : 'en'],
    }
  }

  return metadata
}

/** Shorthand for a CMS page's own layout / route file */
export const pageMetadata = (page: SeoPageKey, locale: Locale = 'en') => () =>
  getPageMetadata(page, locale, SEO_PAGE_PATHS[page])

type SlugParams = { params: Promise<{ slug: string }> }

/** Blog article: the Blog SEO text, with the article's own canonical/hreflang */
export const blogArticleMetadata = (locale: Locale) => async ({ params }: SlugParams) => {
  const { slug } = await params
  return getPageMetadata('blogs', locale, `/blogs/${encodeURIComponent(slug)}`)
}
