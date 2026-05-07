'use client'

import Link from 'next/link'
import { useLanguage } from './LanguageProvider'

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

const practiceAreas = [
  'common.practiceAreas.immigration.title',
  'common.practiceAreas.criminal.title',
  'common.practiceAreas.civil.title',
  'common.practiceAreas.corporate.title',
  'common.practiceAreas.family.title',
  'common.practiceAreas.realEstate.title',
  'common.practiceAreas.intellectualProperty.title',
  'common.practiceAreas.bankingFinance.title',
]

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="surface-inlay border-t border-outline-variant px-4 sm:px-6 py-8 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-on-surface">
            <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-secondary/10 text-sm sm:text-base text-secondary ring-1 ring-secondary/20">⚖️</span>
            Islam & Associates
          </div>
          <p className="max-w-sm text-xs sm:text-sm leading-6 text-on-surface-variant">
            1st Floor, 30 Court House Street, Dhaka 1000, Bangladesh
          </p>
          <p className="text-xs sm:text-sm leading-6 text-on-surface-variant">Phone: +88-01715365380 | Fax: +88-02-8052345</p>
         
        </div>

        <div>
          <SectionHeading>{t('common.quickLinks')}</SectionHeading>
          <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-xs sm:text-sm">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-on-surface-variant transition hover:text-secondary">
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionHeading>{t('common.footerPracticeAreas')}</SectionHeading>
          <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 text-xs sm:text-sm text-on-surface-variant sm:grid-cols-2">
            {practiceAreas.map((area) => (
              <span key={area}>{t(area)}</span>
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
