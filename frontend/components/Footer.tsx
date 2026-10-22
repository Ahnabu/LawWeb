'use client'

import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import { useContentList, useSiteSettings } from './contentHooks'
import { practiceAreas } from '../lib/data'
import type { SocialLink } from '../lib/content'

export const socialLabels: Record<SocialLink['platform'], string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
  instagram: 'Instagram',
}

// Brand glyphs (lucide-react v1 dropped brand icons), drawn in the same stroke style.
export const socialIcons: Record<SocialLink['platform'], React.ReactNode> = {
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
    <h3 className="font-body text-sm font-semibold text-on-surface">
      {children}
    </h3>
  )
}

const quickLinks = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.about', href: '/about' },
  { labelKey: 'nav.lawyers', href: '/lawyers' },
  { labelKey: 'nav.gallery', href: '/gallery' },
  { labelKey: 'nav.appointment', href: '/appointment' },
  { labelKey: 'nav.caseTracker', href: '/track-case' },
  { labelKey: 'nav.contact', href: '/contact' },
]

export function Footer() {
  const { t, localePath } = useLanguage()
  const settings = useSiteSettings()
  const areas = useContentList('practice-areas', 'areas', practiceAreas)

  return (
    <footer className="border-t border-outline-variant bg-surface-container px-4 pb-8 pt-12 shadow-[inset_0_1px_0_var(--highlight)] sm:px-6 sm:pt-14 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3 text-sm leading-6 text-on-surface-variant">
          <p className="font-display text-lg font-bold text-heading">{t('site.firmName')}</p>
          {/* <p className="max-w-sm">{t('site.address')}</p> */}
          <p>
            {t('site.phoneLabel')}: {settings.phoneDisplay}
            {/* Fax hidden at client's request: | {t('site.faxLabel')}: {settings.fax} */}
          </p>
          {settings.email && (
            <p>
              {t('site.emailLabel')}:{' '}
              <a href={`mailto:${settings.email}`} className="text-on-surface underline-offset-4 transition-colors hover:underline">
                {settings.email}
              </a>
            </p>
          )}
          {settings.socials.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="mr-1">{t('site.followUs')}:</span>
              {settings.socials.map((social) => (
                <a
                  key={`${social.platform}-${social.url}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabels[social.platform]}
                  title={socialLabels[social.platform]}
                  className="btn btn-secondary btn-icon text-on-surface-variant"
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

        <nav aria-label={t('common.quickLinks')}>
          <SectionHeading>{t('common.quickLinks')}</SectionHeading>
          <ul className="mt-3 space-y-1 text-sm">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={localePath(item.href)}
                  className="inline-flex min-h-8 items-center text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <SectionHeading>{t('common.footerPracticeAreas')}</SectionHeading>
          <ul className="mt-3 grid gap-x-4 gap-y-2 text-sm text-on-surface-variant sm:grid-cols-2">
            {areas.map((area) => (
              <li key={area.id}>{area.title}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl">
        <hr className="rule" />
        <div className="pt-5 text-xs text-on-surface-variant sm:flex sm:items-center sm:justify-between sm:text-sm">
          <p>{t('common.footerRights')}</p>
          <p className="mt-1 sm:mt-0">{t('common.footerTagline')}</p>
        </div>
      </div>
    </footer>
  )
}
