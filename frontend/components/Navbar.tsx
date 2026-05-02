import Link from 'next/link'
import { navLinks } from '../lib/data'
import { LanguageToggle } from './LanguageToggle'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/30 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">⚖️</span>
          <span className="text-lg text-primary">Islam & Associates</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-800 transition hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link href="/login" className="rounded-full border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 transition hover:bg-amber-600">
            Login
          </Link>
        </div>
      </div>
    </header>
  )
}
