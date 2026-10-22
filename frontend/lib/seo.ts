import type { Metadata } from 'next'
import { getPublishedBlog } from './blogs'
import { buildStringOverrides, getPublishedContent, resolveString, type StringOverrides } from './content'
import type { Locale } from './i18n'
import { getPublicLawyer } from './lawyers'
import { getRouteLocale, languageAlternates, localizePath } from './locale'
import { richTextToPlain } from './richText'

// ── Per-page SEO (CMS-editable) ───────────────────────────────────────────────
// Title and description come from the `seo.<page>.*` i18n keys, so admins edit
// them like any other text and an empty CMS falls back to i18n.ts. The language
// comes from the route (/about → English, /bn/about → Bangla).

export type SeoPageKey = 'home' | 'about' | 'practiceAreas' | 'trackCase' | 'blogs' | 'contact'

export const SEO_PAGE_PATHS: Record<SeoPageKey, string> = {
  home: '/',
  about: '/about',
  practiceAreas: '/practice-areas',
  trackCase: '/track-case',
  blogs: '/blogs',
  contact: '/contact',
}

// Single-language public pages (no /bn URL). Their SEO text is code-only
// (i18n `seo.*`), since they are not CMS pages.
export const SINGLE_LANGUAGE_SEO_PATHS = {
  lawyers: '/lawyers',
  appointment: '/appointment',
} as const

type SingleLanguagePageKey = keyof typeof SINGLE_LANGUAGE_SEO_PATHS

const OG_LOCALES: Record<Locale, string> = { en: 'en_US', bn: 'bn_BD' }

// Shared preview for links to pages without their own image (public/og-image.jpg)
export const DEFAULT_OG_IMAGE = { url: '/og-image.jpg', width: 1200, height: 630, alt: 'Islam & Associates' }

export interface SeoImage {
  url: string
  width?: number
  height?: number
  alt?: string
}

export interface MetadataInput {
  title: string
  description: string
  locale?: Locale
  /**
   * The plain English path. Sets the canonical URL, plus `hreflang` alternates
   * when the route exists in both languages. The root layout omits it so those
   * tags don't leak onto dashboard and other routes.
   */
  path?: string
  /** One canonical URL (the English one) for every language, and no hreflang:
   *  for pages whose main content is not translated, such as blog articles */
  singleUrl?: boolean
  image?: SeoImage
  type?: 'website' | 'article' | 'profile'
  article?: { publishedTime?: string; modifiedTime?: string; authors?: string[]; section?: string; tags?: string[] }
}

// Same cached fetch as the root layout, so this adds no backend request
async function getStringOverrides(): Promise<StringOverrides> {
  return buildStringOverrides(await getPublishedContent())
}

/** Title, description, canonical/hreflang, Open Graph and Twitter tags for a page */
export async function buildMetadata(input: MetadataInput, overrides?: StringOverrides): Promise<Metadata> {
  const { title, description, locale = 'en', path, singleUrl = false, image = DEFAULT_OG_IMAGE, type = 'website', article } = input
  const siteName = resolveString(locale, 'site.firmName', overrides ?? (await getStringOverrides()))
  const bilingual = path !== undefined && !singleUrl && getRouteLocale(path) !== null
  const url = path === undefined ? undefined : localizePath(path, singleUrl ? 'en' : locale)

  const shared = {
    title,
    description,
    siteName,
    url,
    locale: OG_LOCALES[locale],
    ...(bilingual && { alternateLocale: OG_LOCALES[locale === 'en' ? 'bn' : 'en'] }),
    images: [image],
  }

  return {
    title,
    description,
    openGraph: type === 'article' ? { ...shared, type, ...article } : { ...shared, type },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    ...(url !== undefined && {
      alternates: bilingual ? { canonical: url, languages: languageAlternates(path!) } : { canonical: url },
    }),
  }
}

/** Metadata for a public page from its CMS-editable `seo.<page>.*` text */
export async function getPageMetadata(
  page: SeoPageKey | SingleLanguagePageKey,
  locale: Locale = 'en',
  path?: string,
): Promise<Metadata> {
  const overrides = await getStringOverrides()
  const title = resolveString(locale, `seo.${page}.title`, overrides)
  const description = resolveString(locale, `seo.${page}.description`, overrides)
  return buildMetadata({ title, description, locale, path }, overrides)
}

/** Shorthand for a CMS page's own layout / route file */
export const pageMetadata = (page: SeoPageKey, locale: Locale = 'en') => () =>
  getPageMetadata(page, locale, SEO_PAGE_PATHS[page])

/** Shorthand for a single-language page's layout / route file */
export const singleLanguagePageMetadata = (page: SingleLanguagePageKey) => () =>
  getPageMetadata(page, 'en', SINGLE_LANGUAGE_SEO_PATHS[page])

/** Metadata for a page search engines should not index (sign-in, account flows) */
export const noIndexMetadata = (title: string): Metadata => ({
  title: `${title} | Islam & Associates`,
  robots: { index: false, follow: true },
})

// ── Blog articles and lawyer profiles ─────────────────────────────────────────

type SlugParams = { params: Promise<{ slug: string }> }

// Search results cut titles at about 60 characters
const TITLE_LIMIT = 60

/** The first candidate that fits the title limit, else the last (shortest) one */
function fitTitle(...candidates: string[]): string {
  return candidates.find((title) => title.length <= TITLE_LIMIT) ?? candidates[candidates.length - 1]
}

const NOT_FOUND_METADATA: Metadata = { title: 'Page not found', robots: { index: false, follow: true } }

/**
 * Blog article: its own title, excerpt and cover image. Articles are not
 * translated, so /bn/blogs/x is the same text as /blogs/x and both declare
 * the English URL canonical instead of claiming to be a Bangla version.
 */
export const blogArticleMetadata = (locale: Locale) => async ({ params }: SlugParams): Promise<Metadata> => {
  const { slug } = await params
  const [blog, overrides] = await Promise.all([getPublishedBlog(slug), getStringOverrides()])
  if (!blog) return NOT_FOUND_METADATA

  return buildMetadata(
    {
      title: fitTitle(`${blog.title} | ${resolveString(locale, 'site.firmName', overrides)}`, blog.title),
      description: blog.excerpt,
      locale,
      path: `/blogs/${encodeURIComponent(blog.slug)}`,
      singleUrl: true,
      type: 'article',
      image: blog.coverImageUrl ? { url: blog.coverImageUrl, alt: blog.title } : undefined,
      article: {
        publishedTime: blog.publishedAt ?? blog.createdAt,
        modifiedTime: blog.updatedAt,
        authors: [blog.authorName],
        section: blog.category,
        tags: blog.tags,
      },
    },
    overrides,
  )
}

type LawyerParams = { params: Promise<{ id: string }> }

/** Lawyer profile: name, designation and bio summary, with the profile photo */
export async function lawyerProfileMetadata({ params }: LawyerParams): Promise<Metadata> {
  const { id } = await params
  const [lawyer, overrides] = await Promise.all([getPublicLawyer(id), getStringOverrides()])
  if (!lawyer) return NOT_FOUND_METADATA

  const { user, profile } = lawyer
  const firmName = resolveString('en', 'site.firmName', overrides)
  const designation = profile?.designation?.en?.trim() || 'Advocate'
  const bio = richTextToPlain(profile?.bio?.en, 155)
  const areas = profile?.practiceAreas?.length ? profile.practiceAreas.join(', ') : user.specialization

  return buildMetadata(
    {
      title: fitTitle(`${user.name}, ${designation} | ${firmName}`, `${user.name} | ${firmName}`, user.name),
      description: bio || `${user.name} is ${/^[aeiou]/i.test(designation) ? 'an' : 'a'} ${designation} at ${firmName} in Dhaka, Bangladesh${areas ? `, practising ${areas}` : ''}. Book a consultation online.`,
      path: `/lawyers/${encodeURIComponent(id)}`,
      type: 'profile',
      image: profile?.profileImageUrl ? { url: profile.profileImageUrl, alt: user.name } : undefined,
    },
    overrides,
  )
}
