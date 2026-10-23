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

  const now = new Date()

  const bilingual: MetadataRoute.Sitemap = Object.values(SEO_PAGE_PATHS).flatMap((path) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, absolute(href)]),
    )
    return (['en', 'bn'] as const).map((locale) => ({
      url: absolute(localizePath(path, locale)),
      lastModified: now,
      changeFrequency: path === '/' ? 'daily' : 'weekly',
      priority: path === '/' ? 1.0 : 0.8,
      alternates: { languages },
    }))
  })

  const singleUrl: MetadataRoute.Sitemap = [
    ...Object.values(SINGLE_LANGUAGE_SEO_PATHS).map((path) => ({
      url: absolute(path),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...lawyerIds.map((id) => ({
      url: absolute(`/lawyers/${encodeURIComponent(id)}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...blogs.map((blog) => {
      const date = blog.publishedAt ?? blog.createdAt
      return {
        url: absolute(`/blogs/${encodeURIComponent(blog.slug)}`),
        lastModified: date ? new Date(date) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }
    }),
  ]

  return [...bilingual, ...singleUrl]
}
