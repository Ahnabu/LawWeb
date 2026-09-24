import type { Metadata } from 'next'
import { buildStringOverrides, getPublishedContent, resolveString } from './content'

// ── Per-page SEO (CMS-editable) ───────────────────────────────────────────────
// Title and description come from the `seo.<page>.*` i18n keys, so admins edit
// them like any other text and an empty CMS falls back to i18n.ts. Metadata is
// rendered on the server, where the visitor's language (localStorage) is
// unknown, so it uses English until the /bn routes phase.

export type SeoPageKey = 'home' | 'about' | 'practiceAreas' | 'trackCase' | 'blogs'

export async function getPageMetadata(page: SeoPageKey): Promise<Metadata> {
  // Same cached fetch as the root layout, so this adds no backend request
  const overrides = buildStringOverrides(await getPublishedContent())
  const title = resolveString('en', `seo.${page}.title`, overrides)
  const description = resolveString('en', `seo.${page}.description`, overrides)

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  }
}
