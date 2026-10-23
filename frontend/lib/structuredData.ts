import type { BlogPost } from './blogs'
import { buildStringOverrides, resolveString, type PublishedContent, type SiteSettingsOverride } from './content'
import type { PublicLawyerProfile, PublicLawyerUser } from './lawyers'
import { getSiteUrl } from './locale'
import { richTextToPlain } from './richText'
import { resolveSiteSettings } from './siteConfig'

// ── Structured data (schema.org JSON-LD) ──────────────────────────────────────
// Tells search engines what the firm is, who its lawyers are and who wrote each
// article. Built from the same published CMS content as the visible page, so
// the two can't disagree. Rendered with <JsonLd />.

type JsonLdObject = Record<string, unknown>

const absolute = (path: string) => (/^https?:\/\//i.test(path) ? path : `${getSiteUrl()}${path}`)
const organizationId = () => `${getSiteUrl()}/#organization`

/** The firm as a LegalService (a LocalBusiness), on every page via the root layout */
export function legalServiceJsonLd(content: PublishedContent): JsonLdObject {
  const overrides = buildStringOverrides(content)
  const settings = resolveSiteSettings(content.site?.settings as SiteSettingsOverride | undefined)
  const sameAs = settings.socials.map((social) => social.url).filter(Boolean)
  // A street address that is only the country name says nothing more than addressCountry
  const street = resolveString('en', 'site.address', overrides).trim()

  return {
    '@context': 'https://schema.org',
    '@type': ['LegalService', 'Attorney'],
    '@id': organizationId(),
    name: 'Islam & Associates International',
    legalName: 'Islam & Associates International',
    alternateName: [
      resolveString('en', 'site.firmName', overrides),
      resolveString('bn', 'site.firmName', overrides),
      'Islam and Associates International Law Offices',
    ],
    description: resolveString('en', 'seo.home.description', overrides),
    url: `${getSiteUrl()}/`,
    logo: absolute('/logo.jpg'),
    image: absolute('/og-image.jpg'),
    telephone: settings.phone,
    faxNumber: settings.fax || undefined,
    email: settings.email || undefined,
    foundingDate: '1997',
    priceRange: '$$',
    currenciesAccepted: 'BDT, USD, GBP, EUR',
    paymentAccepted: 'Cash, Bank Transfer, Credit Card',
    knowsAbout: [
      'Corporate Law',
      'Civil Litigation',
      'Criminal Defense',
      'Immigration Law',
      'Family Law',
      'Banking & Finance Law',
      'Property & Land Law',
      'Intellectual Property',
      'Arbitration & Mediation',
    ],
    address: {
      '@type': 'PostalAddress',
      ...(street && !/^bangladesh$/i.test(street) && { streetAddress: street }),
      addressLocality: 'Dhaka',
      addressRegion: 'Dhaka Division',
      postalCode: '1000',
      addressCountry: 'BD',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 23.7099,
      longitude: 90.4125,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '09:00',
        closes: '19:00',
      },
    ],
    areaServed: [
      { '@type': 'Country', name: 'Bangladesh' },
      { '@type': 'City', name: 'Dhaka' },
    ],
    knowsLanguage: ['en', 'bn'],
    ...(sameAs.length > 0 && { sameAs }),
  }
}

/** A blog article, attributed to its author and published by the firm */
export function blogPostingJsonLd(blog: BlogPost): JsonLdObject {
  const url = absolute(`/blogs/${encodeURIComponent(blog.slug)}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    headline: blog.title,
    description: blog.excerpt,
    image: blog.coverImageUrl ? [blog.coverImageUrl] : [absolute('/og-image.jpg')],
    datePublished: blog.publishedAt ?? blog.createdAt,
    dateModified: blog.updatedAt ?? blog.publishedAt ?? blog.createdAt,
    author: { '@type': 'Person', name: blog.authorName },
    publisher: { '@id': organizationId() },
    articleSection: blog.category.replace(/-/g, ' '),
    ...(blog.tags.length > 0 && { keywords: blog.tags.join(', ') }),
  }
}

/** A lawyer's public profile; contact details stay off (the firm's are used) */
export function lawyerJsonLd(user: PublicLawyerUser, profile: PublicLawyerProfile | null): JsonLdObject {
  const url = absolute(`/lawyers/${encodeURIComponent(user._id)}`)
  const knowsAbout = profile?.practiceAreas?.length
    ? profile.practiceAreas
    : (user.specialization ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const alumniOf = (profile?.education ?? [])
    .map((entry) => entry.institution?.trim())
    .filter(Boolean)
    .map((name) => ({ '@type': 'EducationalOrganization', name }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}#person`,
    name: user.name,
    url,
    jobTitle: profile?.designation?.en?.trim() || 'Advocate',
    description: richTextToPlain(profile?.bio?.en, 300) || undefined,
    image: profile?.profileImageUrl || undefined,
    worksFor: { '@id': organizationId() },
    ...(knowsAbout.length > 0 && { knowsAbout }),
    ...(profile?.languages?.length && { knowsLanguage: profile.languages }),
    ...(alumniOf.length > 0 && { alumniOf }),
  }
}
