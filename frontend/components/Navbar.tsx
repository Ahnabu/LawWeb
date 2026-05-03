import Link from 'next/link'
import { navLinks } from '../lib/data'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">⚖️</span>
          <span className="text-lg font-semibold tracking-wide text-on-surface">Islam & Associates</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-on-surface-variant transition hover:text-gold">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/login" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy/90 dark:bg-gold dark:text-navy dark:hover:bg-gold/90">
            Login
          </Link>
        </div>
      </div>
    </header>
  )
}
