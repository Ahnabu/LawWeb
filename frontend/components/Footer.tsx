'use client'

import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import { useContentList, useSiteSettings } from './contentHooks'
import { practiceAreas } from '../lib/data'
import type { SocialLink } from '../lib/content'

const socialLabels: Record<SocialLink['platform'], string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
  instagram: 'Instagram',
}

// Brand glyphs (lucide-react v1 dropped brand icons), drawn in the same stroke style.
const socialIcons: Record<SocialLink['platform'], React.ReactNode> = {
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  youtube: (
    <>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </>
  ),
  x: (
    <>
      <path d="M4 4l11.733 16H20L8.267 4z" />
      <path d="M4 20l6.768-6.768M13.232 10.768L20 4" />
    </>
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface">
      {children}
    </h3>
  )
}

const quickLinks = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.about', href: '/about' },
  { labelKey: 'nav.lawyers', href: '/lawyers' },
  { labelKey: 'nav.appointment', href: '/dashboard/client/appointment' },
  { labelKey: 'nav.caseTracker', href: '/track-case' },
]

export function Footer() {
  const { t, localePath } = useLanguage()
  const settings = useSiteSettings()
  const areas = useContentList('practice-areas', 'areas', practiceAreas)

  return (
    <footer className="surface-inlay border-t border-outline-variant px-4 sm:px-6 py-8 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-on-surface">
            <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-secondary/10 text-sm sm:text-base text-secondary ring-1 ring-secondary/20">⚖️</span>
            {t('site.firmName')}
          </div>
          <p className="max-w-sm text-xs sm:text-sm leading-6 text-on-surface-variant">
            {t('site.address')}
          </p>
          <p className="text-xs sm:text-sm leading-6 text-on-surface-variant">
            {t('site.phoneLabel')}: {settings.phoneDisplay} | {t('site.faxLabel')}: {settings.fax}
          </p>
          {settings.email && (
            <p className="text-xs sm:text-sm leading-6 text-on-surface-variant">
              {t('site.emailLabel')}:{' '}
              <a href={`mailto:${settings.email}`} className="transition hover:text-secondary">
                {settings.email}
              </a>
            </p>
          )}
          {settings.socials.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
              <span className="text-on-surface-variant">{t('site.followUs')}:</span>
              {settings.socials.map((social) => (
                <a
                  key={`${social.platform}-${social.url}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabels[social.platform]}
                  title={socialLabels[social.platform]}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary ring-1 ring-secondary/20 transition hover:bg-secondary hover:text-on-secondary"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {socialIcons[social.platform]}
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeading>{t('common.quickLinks')}</SectionHeading>
          <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-xs sm:text-sm">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={localePath(item.href)} className="text-on-surface-variant transition hover:text-secondary">
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionHeading>{t('common.footerPracticeAreas')}</SectionHeading>
          <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 text-xs sm:text-sm text-on-surface-variant sm:grid-cols-2">
            {areas.map((area) => (
              <span key={area.id}>{area.title}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-10 border-t border-outline-variant pt-4 sm:pt-6 text-xs sm:text-sm text-on-surface-variant sm:flex sm:items-center sm:justify-between">
        <p>{t('common.footerRights')}</p>
        <p className="mt-2 sm:mt-0">{t('common.footerTagline')}</p>
      </div>
    </footer>
  )
}
