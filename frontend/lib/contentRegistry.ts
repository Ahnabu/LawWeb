import type { ContentPageKey } from './content'
import {
  aboutCertifications,
  homeStats,
  missionValues,
  practiceAreas,
  principalCredentials,
  successStories,
  timelineItems,
} from './data'

// ── CMS admin editor registry ─────────────────────────────────────────────────
// Describes what the admin can edit on each page: pages → sections → fields.
// Must mirror backend/src/config/contentSchemas.ts (list names, item fields and
// max lengths). Each i18n key must appear on exactly one page, because string
// overrides from every page are merged into one map on the public site.

export const SHORT_TEXT = 200
export const LONG_TEXT = 2000

// An i18n key the admin can override (stored under `strings`)
export interface TextField {
  key: string
  label: string
  multiline?: boolean
}

// One field of a list item. `localized` = { en, bn }; `plain` = one string
// for both languages; `slug` = URL-safe id (practice areas).
export interface ListItemField {
  name: string
  label: string
  type: 'localized' | 'plain' | 'slug'
  multiline?: boolean
  maxLength: number
}

// A repeatable list, stored under `data[name]`. When `fields` is omitted the
// items are bare { en, bn } values (e.g. certifications).
export interface ListDef {
  name: string
  label: string
  itemLabel: string
  max: number
  maxLength?: number
  fields?: ListItemField[]
  defaults: readonly Record<string, string>[]
}

// An uploaded image URL, stored under `data[name]` (one for both languages)
export interface ImageField {
  name: string
  label: string
  hint?: string
}

export interface ContentSection {
  title: string
  description?: string
  texts?: TextField[]
  images?: ImageField[]
  list?: ListDef
  // Site contact settings (phone, WhatsApp, socials); only on the `site` page
  settings?: boolean
}

export interface ContentPageDef {
  key: ContentPageKey
  title: string
  description: string
  // Public page to open after publishing; omitted for site-wide pages
  publicPath?: string
  sections: ContentSection[]
}

const text = (key: string, label: string, multiline = false): TextField => ({ key, label, multiline })

const localizedField = (name: string, label: string, maxLength = SHORT_TEXT, multiline = false): ListItemField => ({
  name,
  label,
  type: 'localized',
  maxLength,
  multiline,
})

// Browser tab title and search result snippet. Metadata is rendered on the
// server, which can't see the visitor's language, so only English is used
// until the /bn routes phase; Bangla is stored for then.
const seoSection = (page: string): ContentSection => ({
  title: 'Search engines (SEO)',
  description:
    'The browser tab title and the snippet shown in Google results. Keep titles under about 60 characters and descriptions under about 160. Only English is shown for now; Bangla will be used once Bangla page addresses launch.',
  texts: [text(`seo.${page}.title`, 'Page title'), text(`seo.${page}.description`, 'Meta description', true)],
})

export const contentRegistry: ContentPageDef[] = [
  {
    key: 'site',
    title: 'Site Settings',
    description: 'Contact details, social links, firm name and address shown across the site.',
    sections: [
      {
        title: 'Contact details',
        description: 'Used by the footer, WhatsApp buttons and call links. Empty fields keep the current value.',
        settings: true,
      },
      {
        title: 'Firm identity',
        texts: [text('site.firmName', 'Firm name'), text('site.address', 'Address', true)],
      },
      {
        title: 'Labels & messages',
        texts: [
          text('site.phoneLabel', 'Phone label'),
          text('site.faxLabel', 'Fax label'),
          text('site.emailLabel', 'Email label'),
          text('site.followUs', 'Social links heading'),
          text('site.whatsappMessage', 'Pre-filled WhatsApp message', true),
        ],
      },
    ],
  },
  {
    key: 'global',
    title: 'Navigation & Footer',
    description: 'Menu labels, footer text and the booking widgets shared by every page.',
    sections: [
      {
        title: 'Navigation menu',
        texts: [
          text('nav.about', 'About'),
          text('nav.lawyers', 'Lawyers'),
          text('nav.practiceAreas', 'Practice areas'),
          text('nav.blogs', 'Blog'),
          text('nav.appointment', 'Appointment'),
          text('nav.contact', 'Contact'),
          text('common.login', 'Login button'),
          text('nav.dashboard', 'Dashboard'),
          text('nav.profile', 'Profile'),
          text('nav.logout', 'Logout'),
        ],
      },
      {
        title: 'Footer',
        texts: [
          text('common.footerTagline', 'Tagline'),
          text('common.quickLinks', 'Quick links heading'),
          text('common.footerPracticeAreas', 'Practice areas heading'),
          text('common.footerRights', 'Copyright line'),
        ],
      },
      {
        title: 'WhatsApp button',
        texts: [text('common.chatWhatsApp', 'Button label'), text('common.messageWhatsApp', 'Link label')],
      },
      {
        title: 'Quick booking widget',
        texts: [
          text('common.quickBooking', 'Heading'),
          text('common.quickBookingText', 'Intro text', true),
          text('common.preferredService', 'Service label'),
          text('common.preferredServiceValue', 'Service value'),
          text('common.fastResponse', 'Response label'),
          text('common.fastResponseValue', 'Response value'),
          text('common.bookConsultation', 'Button label'),
        ],
      },
    ],
  },
  {
    key: 'home',
    title: 'Home',
    description: 'Hero, statistics, success stories and calls to action on the home page.',
    publicPath: '/',
    sections: [
      {
        title: 'Hero',
        images: [
          {
            name: 'heroImage',
            label: 'Background image',
            hint: 'Shown behind the hero text with a dark overlay so the text stays readable. Use a wide landscape photo (at least 1600px wide). Leave empty for the default pattern.',
          },
        ],
        texts: [
          text('common.established', 'Eyebrow'),
          text('common.heroTitle', 'Title'),
          text('common.heroSubtitle', 'Subtitle', true),
          text('common.bookAppointment', 'Primary button'),
          text('common.whatsapp', 'WhatsApp button'),
        ],
      },
      {
        title: 'Statistics',
        list: {
          name: 'stats',
          label: 'Statistics',
          itemLabel: 'Statistic',
          max: 8,
          fields: [localizedField('value', 'Value', 60), localizedField('label', 'Label', 60)],
          defaults: homeStats,
        },
      },
      {
        title: 'Practice areas section',
        description: 'The practice areas themselves are edited on the Practice Areas page.',
        texts: [
          text('common.practiceSectionLabel', 'Eyebrow'),
          text('common.practiceHeading', 'Heading'),
          text('common.practiceDetail', 'Intro text', true),
          text('common.viewAll', 'Link label'),
        ],
      },
      {
        title: 'Lawyers section',
        texts: [
          text('common.teamSectionLabel', 'Eyebrow'),
          text('common.teamHeading', 'Heading'),
          text('common.viewAllLawyers', 'Link label'),
        ],
      },
      {
        title: 'Success stories',
        texts: [text('common.victoriesSectionLabel', 'Eyebrow'), text('common.victoriesHeading', 'Heading')],
        list: {
          name: 'successStories',
          label: 'Stories',
          itemLabel: 'Story',
          max: 12,
          fields: [
            localizedField('title', 'Title'),
            localizedField('summary', 'Summary', LONG_TEXT, true),
            localizedField('quote', 'Client quote', LONG_TEXT, true),
            localizedField('badge', 'Badge', 60),
            { name: 'initials', label: 'Client initials', type: 'plain', maxLength: 10 },
          ],
          defaults: successStories,
        },
      },
      {
        title: 'Why choose us',
        texts: [
          text('common.whyChooseSectionLabel', 'Eyebrow'),
          text('common.whyChoose', 'Heading'),
          text('common.feature1Title', 'Point 1 title'),
          text('common.feature1Detail', 'Point 1 detail'),
          text('common.feature2Title', 'Point 2 title'),
          text('common.feature2Detail', 'Point 2 detail'),
          text('common.feature3Title', 'Point 3 title'),
          text('common.feature3Detail', 'Point 3 detail'),
        ],
      },
      {
        title: 'Call to action',
        texts: [
          text('common.ctaSectionLabel', 'Eyebrow'),
          text('common.ctaTitle', 'Title'),
          text('common.ctaBookAppointment', 'Booking button'),
          text('common.ctaChatWhatsApp', 'WhatsApp button'),
        ],
      },
      seoSection('home'),
    ],
  },
  {
    key: 'about',
    title: 'About Us',
    description: 'Firm overview, certifications, founding timeline, principal profile and values.',
    publicPath: '/about',
    sections: [
      {
        title: 'Hero',
        texts: [
          text('about.heroLabel', 'Eyebrow'),
          text('about.heroTitle', 'Title'),
          text('about.heroSubtitle', 'Subtitle', true),
        ],
      },
      {
        title: 'Overview & promise',
        texts: [
          text('about.overviewTitle', 'Overview heading'),
          text('about.overviewText', 'Overview text', true),
          text('about.promiseTitle', 'Promise heading'),
          text('about.promiseText', 'Promise text', true),
        ],
      },
      {
        title: 'Certifications & affiliations',
        texts: [text('about.certificationsTitle', 'Heading')],
        list: {
          name: 'certifications',
          label: 'Certifications',
          itemLabel: 'Certification',
          max: 20,
          maxLength: SHORT_TEXT,
          defaults: aboutCertifications,
        },
      },
      {
        title: 'Founding timeline',
        texts: [text('about.timelineTitle', 'Heading')],
        list: {
          name: 'timeline',
          label: 'Timeline',
          itemLabel: 'Milestone',
          max: 20,
          fields: [
            localizedField('year', 'Year / period', 60),
            localizedField('title', 'Title'),
            localizedField('description', 'Description', LONG_TEXT, true),
          ],
          defaults: timelineItems,
        },
      },
      {
        title: 'Principal profile',
        texts: [
          text('about.principalTitle', 'Heading'),
          text('about.principalName', 'Name & qualifications'),
          text('about.principalText', 'Profile text', true),
        ],
        list: {
          name: 'credentials',
          label: 'Credentials',
          itemLabel: 'Credential',
          max: 20,
          maxLength: SHORT_TEXT,
          defaults: principalCredentials,
        },
      },
      {
        title: 'Mission & values',
        texts: [text('about.missionTitle', 'Heading')],
        list: {
          name: 'values',
          label: 'Values',
          itemLabel: 'Value',
          max: 10,
          fields: [localizedField('title', 'Title'), localizedField('description', 'Description', LONG_TEXT, true)],
          defaults: missionValues,
        },
      },
      seoSection('about'),
    ],
  },
  {
    key: 'practice-areas',
    title: 'Practice Areas',
    description: 'The practice areas list, shown on the Practice Areas page, the home page and the footer.',
    publicPath: '/practice-areas',
    sections: [
      {
        title: 'Page header',
        texts: [
          text('common.practicePageTitle', 'Title'),
          text('common.practicePageSubtitle', 'Subtitle', true),
          text('common.allPracticeAreasTitle', 'List heading'),
        ],
      },
      {
        title: 'Practice areas',
        list: {
          name: 'areas',
          label: 'Practice areas',
          itemLabel: 'Practice area',
          max: 30,
          fields: [
            { name: 'slug', label: 'URL id', type: 'slug', maxLength: 60 },
            localizedField('title', 'Title'),
            localizedField('description', 'Short description'),
            localizedField('details', 'Details', LONG_TEXT, true),
          ],
          defaults: practiceAreas,
        },
      },
      seoSection('practiceAreas'),
    ],
  },
  {
    key: 'track-case',
    title: 'Track Case',
    description: 'Text on the public case tracking page.',
    publicPath: '/track-case',
    sections: [
      {
        title: 'Header & search',
        texts: [
          text('trackCase.label', 'Eyebrow'),
          text('trackCase.title', 'Title'),
          text('trackCase.subtitle', 'Subtitle', true),
          text('trackCase.placeholder', 'Search placeholder'),
          text('trackCase.trackNow', 'Search button'),
          text('trackCase.searching', 'Searching label'),
          text('trackCase.emptyHint', 'Empty state hint'),
        ],
      },
      {
        title: 'Result details',
        texts: [
          text('trackCase.caseStatus', 'Case status'),
          text('trackCase.stage', 'Stage'),
          text('trackCase.caseType', 'Case type'),
          text('trackCase.assignedLawyer', 'Assigned lawyer'),
          text('trackCase.pendingAssignment', 'No lawyer yet'),
          text('trackCase.court', 'Court'),
          text('trackCase.nextHearing', 'Next hearing'),
          text('trackCase.notScheduled', 'Not scheduled'),
          text('trackCase.filingDate', 'Filing date'),
          text('trackCase.lawyerNotes', 'Lawyer notes'),
          text('trackCase.lastUpdated', 'Last updated'),
        ],
      },
      {
        title: 'Errors',
        texts: [
          text('trackCase.notFound', 'Not found message', true),
          text('trackCase.contactUs', 'Contact link'),
          text('trackCase.fetchError', 'Load error'),
          text('trackCase.genericError', 'Generic error'),
        ],
      },
      seoSection('trackCase'),
    ],
  },
  {
    key: 'blogs',
    title: 'Blog',
    description: 'Text on the blog listing page. Articles themselves are managed under Blogs.',
    publicPath: '/blogs',
    sections: [
      {
        title: 'Header & search',
        texts: [
          text('blogsPage.label', 'Eyebrow'),
          text('blogsPage.title', 'Title'),
          text('blogsPage.subtitle', 'Subtitle', true),
          text('blogsPage.searchPlaceholder', 'Search placeholder'),
        ],
      },
      {
        title: 'Listing',
        texts: [
          text('blogsPage.article', 'Article (singular)'),
          text('blogsPage.articles', 'Articles (plural)'),
          text('blogsPage.minRead', 'Minutes label'),
          text('blogsPage.readMore', 'Read more link'),
          text('blogsPage.noArticles', 'Empty state'),
          text('blogsPage.loadError', 'Load error'),
        ],
      },
      {
        title: 'Category labels',
        texts: [
          'all',
          'immigration',
          'criminal-law',
          'civil-law',
          'corporate-law',
          'family-law',
          'real-estate',
          'banking-finance',
          'labor-law',
          'tax-law',
          'legal-tips',
          'news',
          'other',
        ].map((c) =>
          text(
            `blogsPage.categories.${c}`,
            c.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          ),
        ),
      },
      seoSection('blogs'),
    ],
  },
]

export const getPageDef = (key: string) => contentRegistry.find((page) => page.key === key)
