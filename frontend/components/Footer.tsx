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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
              <span className="text-on-surface-variant">{t('site.followUs')}:</span>
              {settings.socials.map((social) => (
                <a
                  key={`${social.platform}-${social.url}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-secondary transition hover:text-secondary/80"
                >
                  {socialLabels[social.platform]}
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
