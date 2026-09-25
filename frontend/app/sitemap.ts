import type { MetadataRoute } from 'next'
import { API_BASE_URL } from '../lib/api'
import { getSiteUrl, languageAlternates, localizePath } from '../lib/locale'
import { SEO_PAGE_PATHS } from '../lib/seo'

// ── Sitemap ───────────────────────────────────────────────────────────────────
// Every public CMS page and published blog article in both languages, each
// entry listing its hreflang alternates. Rebuilt with the same 5-minute ISR as
// the pages; if the backend is down the articles are left out until then.

export const revalidate = 300

async function getBlogSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/blogs?status=published&limit=1000`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const body = (await res.json()) as { data?: { slug?: string }[] }
    return (body.data ?? []).flatMap((blog) => (blog.slug ? [blog.slug] : []))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl()
  const absolute = (path: string) => `${site}${path === '/' ? '' : path}`
  const paths = [
    ...Object.values(SEO_PAGE_PATHS),
    ...(await getBlogSlugs()).map((slug) => `/blogs/${encodeURIComponent(slug)}`),
  ]

  return paths.flatMap((path) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, absolute(href)]),
    )
    return (['en', 'bn'] as const).map((locale) => ({
      url: absolute(localizePath(path, locale)),
      alternates: { languages },
    }))
  })
}
