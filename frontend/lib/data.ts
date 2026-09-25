export const navLinks = [
  { labelKey: 'nav.about', fallback: 'About Us', href: '/about' },
  { labelKey: 'nav.lawyers', fallback: 'Our Lawyers', href: '/lawyers' },
  { labelKey: 'nav.practiceAreas', fallback: 'Practice Areas', href: '/practice-areas' },
  { labelKey: 'nav.blogs', fallback: 'Blog', href: '/blogs' },
  { labelKey: 'nav.appointment', fallback: 'Appointment', href: '/appointment' },
  { labelKey: 'nav.contact', fallback: 'Contact', href: '/#contact' },
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

export const timelineItems = ['greatGrandfather', 'grandfather', 'father', 'founding', 'global'].map((id) => ({
  id,
  yearKey: `about.timeline.${id}.year`,
  titleKey: `about.timeline.${id}.title`,
  descriptionKey: `about.timeline.${id}.description`,
}))

const aboutInstitutions = ['harvard', 'centralLaw', 'kensington', 'neilWeinrib', 'ashleyBean']

export const aboutCertifications = aboutInstitutions.map((id) => ({ id, labelKey: `about.certifications.${id}` }))

export const principalCredentials = aboutInstitutions.map((id) => ({ id, labelKey: `about.credentials.${id}` }))

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
