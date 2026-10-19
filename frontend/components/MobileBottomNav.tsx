'use client'

import Link from 'next/link'
import { Home, Users, Search, CalendarDays, Phone } from 'lucide-react'
import { useSiteSettings } from './contentHooks'

export function MobileBottomNav() {
  const { telHref } = useSiteSettings()
  return (
    <nav aria-label="Quick links" className="site-header fixed inset-x-0 bottom-0 z-50 block border-b-0 border-t border-outline-variant px-2 py-1.5 sm:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Link href="/" className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-md text-xs text-on-surface-variant transition-colors hover:text-on-surface">
          <Home className="h-5 w-5" /> Home
        </Link>
        <Link href="/lawyers" className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-md text-xs text-on-surface-variant transition-colors hover:text-on-surface">
          <Users className="h-5 w-5" /> Lawyers
        </Link>
        <Link href="/track-case" className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-md text-xs text-on-surface-variant transition-colors hover:text-on-surface">
          <Search className="h-5 w-5" /> Track
        </Link>
        <Link href="/appointment" className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-md text-xs text-on-surface-variant transition-colors hover:text-on-surface">
          <CalendarDays className="h-5 w-5" /> Book
        </Link>
        <a href={telHref()} className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-md text-xs text-on-surface-variant transition-colors hover:text-on-surface">
          <Phone className="h-5 w-5" /> Call
        </a>
      </div>
    </nav>
  )
}
