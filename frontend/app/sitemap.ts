import type { MetadataRoute } from 'next'
import { getPublishedBlogSummaries } from '../lib/blogs'
import { getPublicLawyerIds } from '../lib/lawyers'
import { getSiteUrl, languageAlternates, localizePath } from '../lib/locale'
import { SEO_PAGE_PATHS, SINGLE_LANGUAGE_SEO_PATHS } from '../lib/seo'

// ── Sitemap ───────────────────────────────────────────────────────────────────
// Every public CMS page in both languages (each entry listing its hreflang
// alternates), plus the single-URL pages: lawyers, booking, lawyer profiles and
// blog articles (not translated, so only their English URL). Rebuilt with the
// same 5-minute ISR as the pages; if the backend is down the articles and
// profiles are left out until then.

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl()
  const absolute = (path: string) => `${site}${path === '/' ? '' : path}`
  const [blogs, lawyerIds] = await Promise.all([getPublishedBlogSummaries(), getPublicLawyerIds()])

  const bilingual = Object.values(SEO_PAGE_PATHS).flatMap((path) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, absolute(href)]),
    )
    return (['en', 'bn'] as const).map((locale) => ({
      url: absolute(localizePath(path, locale)),
      alternates: { languages },
    }))
  })

  const singleUrl = [
    ...Object.values(SINGLE_LANGUAGE_SEO_PATHS).map((path) => ({ url: absolute(path) })),
    ...lawyerIds.map((id) => ({ url: absolute(`/lawyers/${encodeURIComponent(id)}`) })),
    ...blogs.map((blog) => {
      const date = blog.publishedAt ?? blog.createdAt
      return {
        url: absolute(`/blogs/${encodeURIComponent(blog.slug)}`),
        ...(date && { lastModified: new Date(date) }),
      }
    }),
  ]

  return [...bilingual, ...singleUrl]
}
