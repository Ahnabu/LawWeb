export const navLinks = [
  { labelKey: 'nav.about', fallback: 'About Us', href: '/about' },
  { labelKey: 'nav.lawyers', fallback: 'Our Lawyers', href: '/lawyers' },
  { labelKey: 'nav.practiceAreas', fallback: 'Practice Areas', href: '/practice-areas' },
  { labelKey: 'nav.blogs', fallback: 'Blog', href: '/blogs' },
  { labelKey: 'nav.gallery', fallback: 'Gallery', href: '/gallery' },
  { labelKey: 'nav.appointment', fallback: 'Appointment', href: '/appointment' },
  { labelKey: 'nav.contact', fallback: 'Contact', href: '/contact' },
]

// Default for the CMS "practice-areas" page's `areas` list (Home, Footer and
// the Practice Areas page all read it through useContentList).
const practiceAreaIds = [
  ['immigration', 'immigration'],
  ['criminal', 'criminal'],
  ['civil', 'civil'],
  ['corporate', 'corporate'],
  ['family', 'family'],
  ['real-estate', 'realEstate'],
  ['intellectual-property', 'intellectualProperty'],
  ['banking-finance', 'bankingFinance'],
]

export const practiceAreas = practiceAreaIds.map(([slug, key]) => ({
  slug,
  titleKey: `common.practiceAreas.${key}.title`,
  descriptionKey: `common.practiceAreas.${key}.description`,
  detailsKey: `common.practiceAreas.${key}.details`,
}))

export const lawyers = [
  {
    id: 'mufassil-islam',
    name: 'Mufassil MM Islam',
    roleKey: 'common.lawyers.mufassil.role',
    barId: 'BC-1245',
    specialties: [
      'common.practiceAreas.corporate.title',
      'common.practiceAreas.immigration.title',
      'common.practiceAreas.civil.title',
    ],
    rating: 4.9,
    bioKey: 'common.lawyers.mufassil.bio',
    casesCount: 96,
    reviews: [
      { name: 'A. Rahman', quote: 'The team delivered fast, trustworthy results under pressure.', rating: 5 },
      { name: 'S. Karim', quote: 'Professional guidance and excellent communication every step.', rating: 5 },
    ],
  },
  {
    id: 'nazrul-islam',
    name: 'Nazrul Islam',
    roleKey: 'common.lawyers.nazrul.role',
    barId: 'BC-1387',
    specialties: [
      'common.practiceAreas.criminal.title',
      'common.practiceAreas.family.title',
      'common.practiceAreas.civil.title',
    ],
    rating: 4.8,
    bioKey: 'common.lawyers.nazrul.bio',
    casesCount: 83,
    reviews: [
      { name: 'R. Ahmed', quote: 'Handled my case with care and extraordinary detail.', rating: 5 },
    ],
  },
  {
    id: 'sadequr-rahman',
    name: 'Sadequr Rahman',
    roleKey: 'common.lawyers.sadequr.role',
    barId: 'BC-1220',
    specialties: [
      'common.practiceAreas.bankingFinance.title',
      'common.practiceAreas.corporate.title',
    ],
    rating: 4.7,
    bioKey: 'common.lawyers.sadequr.bio',
    casesCount: 62,
    reviews: [
      { name: 'N. Akter', quote: 'Responsive and knowledgeable throughout the process.', rating: 5 },
    ],
  },
]

export const homeStats = [1, 2, 3, 4].map((n) => ({
  id: `stat${n}`,
  valueKey: `common.stat${n}`,
  labelKey: `common.statLabel${n}`,
}))

export const successStories = [
  {
    id: 'immigration',
    titleKey: 'common.successStories.immigration.title',
    summaryKey: 'common.successStories.immigration.summary',
    initials: 'A.A.',
    quoteKey: 'common.successStories.immigration.quote',
    badgeKey: 'common.successStories.immigration.badge',
  },
  {
    id: 'corporate',
    titleKey: 'common.successStories.corporate.title',
    summaryKey: 'common.successStories.corporate.summary',
    initials: 'M.R.',
    quoteKey: 'common.successStories.corporate.quote',
    badgeKey: 'common.successStories.corporate.badge',
  },
  {
    id: 'civil',
    titleKey: 'common.successStories.civil.title',
    summaryKey: 'common.successStories.civil.summary',
    initials: 'S.H.',
    quoteKey: 'common.successStories.civil.quote',
    badgeKey: 'common.successStories.civil.badge',
  },
]

// ── About page ────────────────────────────────────────────────────────────────
// Photos ship in public/about; links are plain URLs (same in both languages).

const titledItems = (list: string, ids: string[]) =>
  ids.map((id) => ({ id, titleKey: `about.${list}.${id}.title`, textKey: `about.${list}.${id}.text` }))

export const principalStats = ['years', 'cases', 'countries', 'generations'].map((id) => ({
  id,
  valueKey: `about.principal.stats.${id}.value`,
  labelKey: `about.principal.stats.${id}.label`,
}))

export const principalHighlights = titledItems('highlights', ['academic', 'phd', 'training', 'practice', 'specialisms', 'languages'])

// Optional fields are declared so every item (default or published) has them
type GenerationDefault = {
  id: string
  eraKey: string
  nameKey: string
  relationKey: string
  noteKey?: string
  achievementsKey: string
  photo: string
}

const generation = (id: string) => ({
  id,
  eraKey: `about.generations.items.${id}.era`,
  nameKey: `about.generations.items.${id}.name`,
  relationKey: `about.generations.items.${id}.relation`,
  achievementsKey: `about.generations.items.${id}.achievements`,
})

export const generations: GenerationDefault[] = [
  { ...generation('gen1'), photo: '/about/gen-1.webp' },
  { ...generation('gen2'), photo: '/about/gen-2.webp' },
  { ...generation('gen3'), noteKey: 'about.generations.items.gen3.note', photo: '/about/gen-3.webp' },
  { ...generation('gen4'), photo: '/about/gen-4-chambers.webp' },
]

export const principalCareer = titledItems('career', ['founder', 'international', 'leadership', 'litigation', 'journalism', 'author'])

export const foreignClientFacts = titledItems('foreign', ['rmg', 'workPermit', 'ratio'])

export const diasporaServices = ['hague', 'enforcement', 'custody', 'protection'].map((id) => ({
  id,
  labelKey: `about.diaspora.items.${id}`,
}))

export const cyberPractice = titledItems('cyber', ['facebook', 'espionage', 'socialMedia', 'antiTerrorism'])

type MediaDefault = { id: string; outletKey: string; dateKey?: string; titleKey: string; url?: string }

const mediaItem = (id: string, dated = true): MediaDefault => ({
  id,
  outletKey: `about.media.items.${id}.outlet`,
  ...(dated ? { dateKey: `about.media.items.${id}.date` } : {}),
  titleKey: `about.media.items.${id}.title`,
})

export const mediaCoverage = [
  mediaItem('bbcAsylum'),
  mediaItem('bbcFalluja', false),
  mediaItem('islamChannel', false),
  mediaItem('rt', false),
  mediaItem('dailyMail', false),
  mediaItem('dailyExpress'),
  mediaItem('guardian'),
  mediaItem('belfastTelegraph', false),
]

export const principalBooks = [
  {
    id: 'originOfIslam',
    titleKey: 'about.books.items.originOfIslam.title',
    subtitleKey: 'about.books.items.originOfIslam.subtitle',
    url: 'https://amzn.eu/d/08ZElgsc',
    cover: '/about/book-origin-of-islam.webp',
  },
]

export const scholarLinks = [
  { id: 'academia', url: 'https://independent.academia.edu/MufassilEnglish' },
  { id: 'researchGate', url: 'https://www.researchgate.net/profile/Mufassil-Islam' },
  { id: 'dailyStar', url: 'https://archive.thedailystar.net/law/2008/07/04/campaign.htm' },
].map(({ id, url }) => ({
  id,
  labelKey: `about.research.items.${id}.label`,
  descriptionKey: `about.research.items.${id}.description`,
  url,
}))

const aboutInstitutions = ['harvard', 'centralLaw', 'kensington', 'neilWeinrib', 'ashleyBean']

export const aboutCertifications = aboutInstitutions.map((id) => ({ id, labelKey: `about.certifications.${id}` }))

export const missionValues = ['integrity', 'expertise', 'clientSuccess'].map((id) => ({
  id,
  titleKey: `about.values.${id}.title`,
  descriptionKey: `about.values.${id}.description`,
}))

export const adminStats = [
  { label: 'Total Cases', value: '1,280' },
  { label: 'Active Cases', value: '240' },
  { label: 'Total Lawyers', value: '26' },
  { label: 'Appointments Today', value: '14' },
]

export const adminCases = [
  { id: 'CAS-2026-001', client: 'M. Hossain', lawyer: 'Mufassil MM Islam', type: 'Immigration', status: 'Active' },
  { id: 'CAS-2026-007', client: 'R. Akhter', lawyer: 'Nazrul Islam', type: 'Criminal', status: 'Hearing Scheduled' },
  { id: 'CAS-2026-012', client: 'S. Khan', lawyer: 'Sadequr Rahman', type: 'Corporate', status: 'Filed' },
]

export const upcomingAppointments = [
  { time: '10:00 AM', client: 'A. Rahman', lawyer: 'Mufassil MM Islam' },
  { time: '1:30 PM', client: 'N. Akter', lawyer: 'Nazrul Islam' },
  { time: '4:00 PM', client: 'Z. Karim', lawyer: 'Sadequr Rahman' },
]

export const lawyerStats = [
  { label: 'Active Cases', value: '32' },
  { label: 'Upcoming Appointments', value: '7' },
  { label: 'Cases Won', value: '58' },
  { label: 'Pending Actions', value: '4' },
]

export const lawyerAppointments = [
  { time: '09:30 AM', client: 'M. Rahman' },
  { time: '12:00 PM', client: 'S. Alam' },
  { time: '03:30 PM', client: 'F. Chowdhury' },
]

export const lawyerCases = [
  { id: 'CAS-2026-032', type: 'Immigration', status: 'Active' },
  { id: 'CAS-2026-054', type: 'Corporate', status: 'Under Review' },
  { id: 'CAS-2026-079', type: 'Civil', status: 'Hearing Scheduled' },
]

export const clientStats = [
  { label: 'My Cases', value: '4' },
  { label: 'Upcoming Visits', value: '2' },
  { label: 'Assigned Lawyer', value: 'Nazrul Islam' },
  { label: 'Next Court Date', value: '17 Jun 2026' },
]

export const clientCases = [
  { id: 'CAS-2026-089', type: 'Immigration', status: 'Active' },
  { id: 'CAS-2026-033', type: 'Family', status: 'Filed' },
]

export const clientAppointments = [
  { date: '17 Jun 2026', time: '11:00 AM', lawyer: 'Nazrul Islam' },
  { date: '20 Jun 2026', time: '03:00 PM', lawyer: 'Sadequr Rahman' },
]
