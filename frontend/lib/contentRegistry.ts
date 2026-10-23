import type { ContentPageKey, DefaultItem } from './content'
import {
  aboutCertifications,
  cyberPractice,
  diasporaServices,
  foreignClientFacts,
  generations,
  homeStats,
  mediaCoverage,
  missionValues,
  practiceAreas,
  principalBooks,
  principalCareer,
  principalHighlights,
  principalStats,
  scholarLinks,
  successStories,
} from './data'

// ── CMS admin editor registry ─────────────────────────────────────────────────
// Describes what the admin can edit on each page: pages → sections → fields.
// Must mirror backend/src/config/contentSchemas.ts (list names, item fields and
// max lengths). Each i18n key must appear on exactly one page, because string
// overrides from every page are merged into one map on the public site.

export const SHORT_TEXT = 200
export const LONG_TEXT = 2000
// Practice-area write-ups; keep in step with backend/src/config/contentSchemas.ts
export const DETAILS_TEXT = 6000

// An i18n key the admin can override (stored under `strings`)
export interface TextField {
  key: string
  label: string
  multiline?: boolean
  hint?: string
}

// One field of a list item. `localized` = { en, bn }; `plain` = one string
// for both languages; `slug` = URL-safe id (practice areas); `url` = http(s)
// link; `image` = one uploaded photo URL.
export interface ListItemField {
  name: string
  label: string
  type: 'localized' | 'plain' | 'slug' | 'url' | 'image'
  multiline?: boolean
  maxLength: number
  // May be left empty (localized, url, image)
  optional?: boolean
  hint?: string
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
  defaults: readonly DefaultItem[]
}

// An uploaded image URL, stored under `data[name]` (one for both languages)
export interface ImageField {
  name: string
  label: string
  hint?: string
  // Upright photo (a portrait) instead of a wide banner
  portrait?: boolean
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

// Text the page renders with **bold** and [tag] markup (see InlineText on the About page)
const FORMAT_HINT = 'Wrap words in **double asterisks** to make them bold, or in [square brackets] to show them as a dark tag.'
const formattedText = (key: string, label: string): TextField => ({ key, label, multiline: true, hint: FORMAT_HINT })

const localizedField = (name: string, label: string, maxLength = SHORT_TEXT, multiline = false): ListItemField => ({
  name,
  label,
  type: 'localized',
  maxLength,
  multiline,
})

const URL_TEXT = 500

// Title + description cards (credentials, services, practice desks)
const titledFields = [localizedField('title', 'Title'), localizedField('text', 'Description', LONG_TEXT, true)]

// Browser tab title and search result snippet: English on the plain URL,
// Bangla on the /bn URL
const seoSection = (page: string, title = 'Search engines (SEO)'): ContentSection => ({
  title,
  description:
    'The browser tab title and the snippet shown in Google results and link previews. Put what people search for first and the firm name last. Keep titles under about 60 characters and descriptions between about 120 and 160. The Bangla text is used on the Bangla (/bn) page.',
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
          text('nav.gallery', 'Gallery'),
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
      {
        title: 'Welcome popup',
        description:
          'Pops up a few seconds after a visitor arrives on a public page, with the questions below rotating. Shown again 5 minutes after it is closed, at most 3 times per visit.',
        texts: [
          text('popup.title', 'Heading'),
          ...Array.from({ length: 12 }, (_, i) => text(`popup.q${i + 1}`, `Question ${i + 1}`)),
          text('popup.text', 'Supporting text', true),
          text('popup.book', 'Booking button'),
          text('popup.contact', 'Contact button'),
          text('popup.whatsapp', 'WhatsApp button'),
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
        description:
          'The first 8 practice areas are shown here as cards, followed by a button to the Practice Areas page. The areas themselves are edited on the Practice Areas page.',
        texts: [
          text('common.practiceSectionLabel', 'Eyebrow'),
          text('common.practiceHeading', 'Heading'),
          text('common.practiceDetail', 'Intro text', true),
          text('common.viewAll', 'Button label'),
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
        title: 'From the About page',
        description:
          'Near the end of the home page: the principal, the four generations and the Investment Gateway / Matrimonial Law sections. Their content is edited on the About Us page; only these link labels belong here.',
        texts: [text('home.principalLink', 'Principal: link to the About page'), text('home.generationsLink', 'Generations: link to the About page')],
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
    description:
      'The principal of the firm, the four-generation table, the principal’s work for foreign clients and the diaspora, books and research links, then the firm overview and values.',
    publicPath: '/about',
    sections: [
      {
        title: 'Principal: introduction',
        description: 'The top of the page: photo, name and biography of the principal.',
        images: [
          {
            name: 'principalPhoto',
            label: 'Portrait',
            hint: 'An upright (portrait) photo, at least 800px wide. Leave empty to use the default portrait.',
            portrait: true,
          },
        ],
        texts: [
          text('about.heroLabel', 'Eyebrow'),
          text('about.principal.name', 'Name'),
          text('about.principal.qualifications', 'Qualifications line'),
          text('about.principal.status', 'Status badge'),
          text('about.principal.headline', 'Headline'),
          text('about.principal.specialty', 'Specialist areas', true),
          text('about.principal.bio', 'Biography (leave a blank line between paragraphs)', true),
          text('about.principal.bookCta', 'Booking button'),
          text('about.principal.whatsappCta', 'WhatsApp button'),
        ],
        list: {
          name: 'principalStats',
          label: 'Figures',
          itemLabel: 'Figure',
          max: 6,
          fields: [localizedField('value', 'Value', 60), localizedField('label', 'Label', 60)],
          defaults: principalStats,
        },
      },
      {
        title: 'Principal: qualifications',
        texts: [text('about.highlights.title', 'Heading')],
        list: {
          name: 'principalHighlights',
          label: 'Qualifications',
          itemLabel: 'Qualification',
          max: 12,
          fields: titledFields,
          defaults: principalHighlights,
        },
      },
      {
        title: 'Generations table',
        description:
          'One row per generation, oldest first, each with one photo. The generation number comes from the row order.',
        texts: [
          text('about.generations.label', 'Eyebrow'),
          text('about.generations.title', 'Heading'),
          text('about.generations.subtitle', 'Intro text', true),
          text('about.generations.genShort', 'Generation badge (e.g. "Gen")'),
          text('about.generations.colGeneration', 'Column: generation'),
          text('about.generations.colPhoto', 'Column: photo'),
          text('about.generations.colName', 'Column: name'),
          text('about.generations.colAchievements', 'Column: achievements'),
        ],
        list: {
          name: 'generations',
          label: 'Generations',
          itemLabel: 'Generation',
          max: 10,
          fields: [
            localizedField('name', 'Name'),
            localizedField('relation', 'Relationship (e.g. Father)'),
            localizedField('era', 'Era (e.g. Pakistan period)'),
            { ...localizedField('note', 'Family note', LONG_TEXT, true), optional: true },
            {
              ...localizedField('achievements', 'Achievements', LONG_TEXT, true),
              hint: 'One achievement per line.',
            },
            { name: 'photo', label: 'Photo', type: 'image', maxLength: URL_TEXT, optional: true },
          ],
          defaults: generations,
        },
      },
      {
        title: 'Books',
        description: 'The first book is featured with its cover; any others are listed below it.',
        texts: [
          text('about.books.title', 'Heading'),
          text('about.books.featured', 'Featured label'),
          text('about.books.buy', 'Buy button'),
        ],
        list: {
          name: 'books',
          label: 'Books',
          itemLabel: 'Book',
          max: 6,
          fields: [
            localizedField('title', 'Title'),
            { ...localizedField('subtitle', 'Subtitle or note'), optional: true },
            { name: 'url', label: 'Shop link (e.g. Amazon)', type: 'url', maxLength: URL_TEXT },
            { name: 'cover', label: 'Cover photo', type: 'image', maxLength: URL_TEXT, optional: true },
          ],
          defaults: principalBooks,
        },
      },
      {
        title: 'Scholar profiles & articles',
        texts: [text('about.research.title', 'Heading')],
        list: {
          name: 'scholarLinks',
          label: 'Links',
          itemLabel: 'Link',
          max: 10,
          fields: [
            localizedField('label', 'Name (e.g. ResearchGate)'),
            { ...localizedField('description', 'Description'), optional: true },
            { name: 'url', label: 'Link', type: 'url', maxLength: URL_TEXT },
          ],
          defaults: scholarLinks,
        },
      },
      {
        title: 'For foreign clients (Investment Gateway)',
        description: 'Left half of the two-column section: intro, small fact boxes and a dark note underneath.',
        texts: [
          text('about.foreign.label', 'Eyebrow'),
          text('about.foreign.title', 'Heading'),
          formattedText('about.foreign.text', 'Intro text'),
          text('about.foreign.noteTitle', 'Dark note: title'),
          text('about.foreign.noteText', 'Dark note: text', true),
        ],
        list: {
          name: 'foreignClients',
          label: 'Fact boxes',
          itemLabel: 'Fact box',
          max: 6,
          fields: [localizedField('title', 'Title', 60), localizedField('text', 'Value')],
          defaults: foreignClientFacts,
        },
      },
      {
        title: 'For the Bangladeshi diaspora (Matrimonial Law)',
        description: 'Right half of the two-column section: intro, a ticked list and a closing note.',
        texts: [
          text('about.diaspora.label', 'Eyebrow'),
          text('about.diaspora.title', 'Heading'),
          formattedText('about.diaspora.text', 'Intro text'),
          text('about.diaspora.note', 'Closing note', true),
        ],
        list: {
          name: 'diaspora',
          label: 'Ticked list',
          itemLabel: 'Point',
          max: 12,
          maxLength: SHORT_TEXT,
          defaults: diasporaServices,
        },
      },
      {
        title: 'Cyber law & espionage',
        texts: [
          text('about.cyber.label', 'Eyebrow'),
          text('about.cyber.title', 'Heading'),
          text('about.cyber.text', 'Intro text', true),
        ],
        list: {
          name: 'cyberPractice',
          label: 'Practice desks',
          itemLabel: 'Desk',
          max: 12,
          fields: titledFields,
          defaults: cyberPractice,
        },
      },
      {
        title: 'Principal: career & distinctions',
        texts: [text('about.career.title', 'Heading')],
        list: {
          name: 'principalCareer',
          label: 'Distinctions',
          itemLabel: 'Distinction',
          max: 12,
          fields: titledFields,
          defaults: principalCareer,
        },
      },
      {
        title: 'Media coverage',
        texts: [text('about.media.title', 'Heading'), text('about.media.text', 'Intro text', true)],
        list: {
          name: 'media',
          label: 'Coverage',
          itemLabel: 'Item',
          max: 20,
          fields: [
            localizedField('outlet', 'Outlet (e.g. BBC News)'),
            { ...localizedField('date', 'Date or edition', 60), optional: true },
            localizedField('title', 'Subject'),
            { name: 'url', label: 'Link to the article', type: 'url', maxLength: URL_TEXT, optional: true },
          ],
          defaults: mediaCoverage,
        },
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
    description:
      'The practice areas list. The Practice Areas page shows the first 6 as cards (with the start of their details) and a "See more" button to the details page, where every area is an expandable section; the home page shows the first 8 as cards; the footer lists them all.',
    publicPath: '/practice-areas',
    sections: [
      {
        title: 'Page header',
        texts: [
          text('common.practicePageTitle', 'Eyebrow'),
          text('common.allPracticeAreasTitle', 'Title'),
          text('common.practicePageSubtitle', 'Subtitle', true),
          text('common.practiceSeeMore', '"See more" button'),
        ],
      },
      {
        title: 'Details page header',
        description: 'The page at /practice-areas/all that lists every area with its full details.',
        texts: [
          text('common.practiceDetailsTitle', 'Title'),
          text('common.practiceAccordionHint', 'Hint above the list'),
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
            localizedField('details', 'Details', DETAILS_TEXT, true),
          ],
          defaults: practiceAreas,
        },
      },
      seoSection('practiceAreas'),
      seoSection('practiceAreasAll', 'Search engines (SEO): details page'),
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
          text('trackCase.emailPlaceholder', 'Email placeholder'),
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
        title: 'Archived cases',
        texts: [
          text('trackCase.archived', 'Archived badge'),
          text('trackCase.archivedOn', 'Archived date label'),
          text('trackCase.archivedNotice', 'Archived notice', true),
          text('trackCase.formerLawyer', 'Former lawyer suffix'),
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
          text('blogsPage.loadMore', 'Load more button'),
          text('blogsPage.loadingMore', 'Loading more label'),
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
  {
    key: 'contact',
    title: 'Contact',
    description: 'Text on the Contact page. Phone, email, address and social links come from Site Settings.',
    publicPath: '/contact',
    sections: [
      {
        title: 'Header',
        texts: [
          text('contact.label', 'Eyebrow'),
          text('contact.title', 'Title'),
          text('contact.subtitle', 'Subtitle', true),
        ],
      },
      {
        title: 'Contact cards',
        texts: [
          text('contact.callUs', 'Phone card title'),
          text('contact.whatsappLabel', 'WhatsApp card title'),
          text('contact.whatsappAction', 'WhatsApp card link'),
          text('contact.emailUs', 'Email card title'),
          text('contact.officeTitle', 'Office heading'),
          text('contact.directions', 'Directions link'),
        ],
      },
      {
        title: 'Office hours',
        texts: [text('contact.hoursTitle', 'Heading'), text('contact.hours', 'Hours (one line per row)', true)],
      },
      {
        title: 'Message form',
        description: 'Messages sent with this form appear under Messages in the admin dashboard.',
        texts: [
          text('contact.formTitle', 'Heading'),
          text('contact.formText', 'Intro text', true),
          text('contact.nameLabel', 'Name label'),
          text('contact.emailLabel', 'Email label'),
          text('contact.phoneLabel', 'Phone label'),
          text('contact.subjectLabel', 'Subject label'),
          text('contact.messageLabel', 'Message label'),
          text('contact.optional', 'Optional field marker'),
          text('contact.privacyNote', 'Privacy note', true),
          text('contact.send', 'Send button'),
          text('contact.sending', 'Sending label'),
          text('contact.successTitle', 'Success heading'),
          text('contact.successText', 'Success text', true),
          text('contact.sendAnother', 'Send another link'),
          text('contact.sendError', 'Error message', true),
        ],
      },
      {
        title: 'Booking prompt',
        texts: [
          text('contact.bookTitle', 'Heading'),
          text('contact.bookText', 'Text', true),
          text('contact.bookCta', 'Button label'),
        ],
      },
      seoSection('contact'),
    ],
  },
  {
    key: 'gallery',
    title: 'Gallery',
    description: 'Text on the Gallery page. The photos, their titles and descriptions are managed under Gallery.',
    publicPath: '/gallery',
    sections: [
      {
        title: 'Header',
        texts: [
          text('gallery.label', 'Eyebrow'),
          text('gallery.title', 'Title'),
          text('gallery.subtitle', 'Subtitle', true),
        ],
      },
      {
        title: 'Messages & photo viewer',
        texts: [
          text('gallery.empty', 'Empty state'),
          text('gallery.loadError', 'Load error'),
          text('gallery.retry', 'Retry button'),
          text('gallery.untitled', 'Name for a photo without a title'),
          text('gallery.open', 'Open photo label'),
          text('gallery.close', 'Close button'),
          text('gallery.previous', 'Previous button'),
          text('gallery.next', 'Next button'),
          text('gallery.counter', 'Position, e.g. "{n} of {total}"'),
        ],
      },
      seoSection('gallery'),
    ],
  },
]

export const getPageDef = (key: string) => contentRegistry.find((page) => page.key === key)
