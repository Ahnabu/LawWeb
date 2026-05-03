'use client'

import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import { LanguageToggle } from './LanguageToggle'

const quickLinks = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.about', href: '/about' },
  { labelKey: 'nav.lawyers', href: '/lawyers' },
  { labelKey: 'nav.appointment', href: '/appointment' },
  { labelKey: 'nav.caseTracker', href: '/track-case' },
]

const practiceAreas = ['Immigration', 'Criminal', 'Civil', 'Corporate', 'Family', 'Real Estate', 'IP', 'Banking']

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="surface-inlay border-t border-outline-variant px-6 py-12 sm:px-10">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-on-surface">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-secondary/20">⚖️</span>
            Islam & Associates
          </div>
          <p className="max-w-sm text-sm leading-6 text-on-surface-variant">
            1st Floor, 30 Court House Street, Dhaka 1000, Bangladesh
          </p>
          <p className="text-sm leading-6 text-on-surface-variant">Phone: +88-01715365380 | Fax: +88-02-8052345</p>
          <div className="flex items-center gap-3">
            <LanguageToggle />
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface">{t('common.quickLinks')}</h3>
          <ul className="mt-4 space-y-3 text-sm">
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
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface">{t('common.footerPracticeAreas')}</h3>
          <div className="mt-4 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
            {practiceAreas.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-outline-variant pt-6 text-sm text-on-surface-variant sm:flex sm:items-center sm:justify-between">
        <p>{t('common.footerRights')}</p>
        <p>{t('common.footerTagline')}</p>
      </div>
    </footer>
  )
}
