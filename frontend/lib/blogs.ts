import { API_BASE_URL } from './api'

// ── Published blog articles (server) ──────────────────────────────────────────
// Fetched on the server so the article text, its metadata and structured data
// are in the HTML search engines and link previews read. Same 5-minute ISR as
// the CMS content; the metadata and page share one request per render.

export interface BlogBlock {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'quote' | 'callout' | 'divider' | 'list'
  content?: string
  items?: string[]
}

export interface BlogPost {
  _id: string
  title: string
  slug: string
  excerpt: string
  category: string
  tags: string[]
  blocks: BlogBlock[]
  authorName: string
  readingTimeMinutes: number
  publishedAt?: string
  createdAt: string
  updatedAt?: string
  coverImageUrl?: string
}

export interface BlogSummary {
  slug: string
  publishedAt?: string
  createdAt?: string
}

const BLOG_REVALIDATE_SECONDS = 300

/** A published article, or null when there is none with this slug. Throws when
 *  the backend fails, so an outage shows an error instead of a cached 404. */
export async function getPublishedBlog(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`${API_BASE_URL}/api/blogs/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: BLOG_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Blog request failed with ${res.status}`)
  const body = (await res.json()) as { data?: BlogPost }
  return body.data ?? null
}

/** Every published article for the sitemap; empty if the backend is down */
export async function getPublishedBlogSummaries(): Promise<BlogSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/blogs?status=published&limit=1000`, {
      next: { revalidate: BLOG_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const body = (await res.json()) as { data?: Partial<BlogSummary>[] }
    return (body.data ?? []).flatMap((blog) => (blog.slug ? [{ ...blog, slug: blog.slug }] : []))
  } catch {
    return []
  }
}
