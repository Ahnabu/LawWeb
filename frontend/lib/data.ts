export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Our Lawyers', href: '/lawyers' },
  { label: 'Practice Areas', href: '/practice-areas' },
  { label: 'Case Tracker', href: '/track-case' },
  { label: 'Appointment', href: '/appointment' },
  { label: 'Contact', href: '/#contact' },
]

export const practiceAreas = [
  { title: 'Immigration Law', description: 'Visa appeals, residency, work permits' },
  { title: 'Criminal Law', description: 'Defense for serious charges and bail hearings' },
  { title: 'Civil Litigation', description: 'Disputes, arbitration and civil remedies' },
  { title: 'Corporate Law', description: 'Company formation, contracts and compliance' },
  { title: 'Family Law', description: 'Divorce, custody and family settlements' },
  { title: 'Real Estate', description: 'Property disputes, conveyance, leases' },
  { title: 'Intellectual Property', description: 'Trademarks, patents and IP defense' },
  { title: 'Banking & Finance', description: 'Loans, restructuring, compliance' },
]

export const lawyers = [
  {
    id: 'mufassil-islam',
    name: 'Mufassil MM Islam',
    role: 'Senior Partner',
    barId: 'BC-1245',
    specialties: ['Corporate Law', 'Immigration', 'Civil Litigation'],
    rating: 4.9,
    bio: 'Expert in cross-border legal strategy with more than 27 years of experience.',
    casesCount: 96,
    reviews: [
      { name: 'A. Rahman', quote: 'The team delivered fast, trustworthy results under pressure.', rating: 5 },
      { name: 'S. Karim', quote: 'Professional guidance and excellent communication every step.', rating: 5 },
    ],
  },
  {
    id: 'nazrul-islam',
    name: 'Nazrul Islam',
    role: 'Principal Counsel',
    barId: 'BC-1387',
    specialties: ['Criminal Law', 'Family Law', 'Civil Litigation'],
    rating: 4.8,
    bio: 'Seasoned litigator known for strong courtroom advocacy and client empathy.',
    casesCount: 83,
    reviews: [
      { name: 'R. Ahmed', quote: 'Handled my case with care and extraordinary detail.', rating: 5 },
    ],
  },
  {
    id: 'sadequr-rahman',
    name: 'Sadequr Rahman',
    role: 'Associate Lawyer',
    barId: 'BC-1220',
    specialties: ['Banking & Finance', 'Corporate Law'],
    rating: 4.7,
    bio: 'Focused on commercial and finance matters for corporate clients.',
    casesCount: 62,
    reviews: [
      { name: 'N. Akter', quote: 'Responsive and knowledgeable throughout the process.', rating: 5 },
    ],
  },
]

export const successStories = [
  {
    title: 'Immigration Appeal Won in 30 Days',
    summary: 'A successful visa appeal for a multinational professional in Dhaka.',
    initials: 'A.A.',
    quote: 'Islam & Associates guided me through a fast and stress-free process.',
    badge: 'Immigration',
  },
  {
    title: 'Corporate Restructuring Approved',
    summary: 'Complex restructuring completed with regulatory approval.',
    initials: 'M.R.',
    quote: 'Their precision and knowledge made the matter painless.',
    badge: 'Corporate',
  },
  {
    title: 'Civil Settlement Secured',
    summary: 'Amicable resolution of a high-value civil dispute.',
    initials: 'S.H.',
    quote: 'Trustworthy service with excellent communication.',
    badge: 'Civil',
  },
]

export const timelineItems = [
  { year: '1930s–40s', title: 'Advocate Mumtaz Uddin Ahmed', description: 'Great-grandfather laid the family legal foundation.' },
  { year: '1950s–60s', title: 'Advocate K M Sadequr Rahman', description: 'Grandfather expanded the firm’s civil and corporate practice.' },
  { year: '1970s–80s', title: 'Advocate Nazrul Islam', description: 'Father established the firm’s courtroom excellence.' },
  { year: '1997', title: 'Mufassil MM Islam founded Islam & Associates', description: 'Modern law firm founded in Dhaka with international reach.' },
  { year: '2000s–Present', title: 'Global expansion', description: 'Harvard training and international syndicate partnerships.' },
]

export const practiceAreaDetails = [
  { title: 'Immigration Law', details: 'Assistance with visas, appeals, residency and citizenship matters.' },
  { title: 'Criminal Law', details: 'Defense strategy for charged individuals and bail proceedings.' },
  { title: 'Civil Litigation', details: 'Dispute resolution, claims and arbitration across sectors.' },
  { title: 'Corporate Law', details: 'Corporate compliance, mergers, contracts and company law advice.' },
  { title: 'Family Law', details: 'Custody, divorce and family dispute resolution services.' },
  { title: 'Real Estate', details: 'Property conveyance, disputes and lease agreement support.' },
  { title: 'Intellectual Property', details: 'IP registration, enforcement and dispute defense.' },
  { title: 'Banking & Finance', details: 'Loan agreements, restructuring and financial regulation support.' },
]

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
