'use client'

import Link from 'next/link'
import { navLinks } from '../lib/data'
import { useLanguage } from './LanguageProvider'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const { t } = useLanguage()

  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-secondary/20">⚖️</span>
          <span className="text-lg font-semibold tracking-wide text-on-surface">Islam & Associates</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-on-surface-variant transition hover:text-secondary">
              {t(link.labelKey) ?? link.fallback}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/90">
            {t('common.login')}
          </Link>
        </div>
      </div>
    </header>
  )
}
