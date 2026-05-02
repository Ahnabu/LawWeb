'use client'

import Link from 'next/link'
import { Home, Users, Search, CalendarDays, Phone } from 'lucide-react'

export function MobileBottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 block rounded-t-3xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/5 sm:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between px-3">
        <Link href="/" className="flex flex-col items-center gap-1 text-xs text-slate-600">
          <Home className="h-5 w-5" /> Home
        </Link>
        <Link href="/lawyers" className="flex flex-col items-center gap-1 text-xs text-slate-600">
          <Users className="h-5 w-5" /> Lawyers
        </Link>
        <Link href="/track-case" className="flex flex-col items-center gap-1 text-xs text-slate-600">
          <Search className="h-5 w-5" /> Track
        </Link>
        <Link href="/appointment" className="flex flex-col items-center gap-1 text-xs text-slate-600">
          <CalendarDays className="h-5 w-5" /> Book
        </Link>
        <a href="tel:+8801715365380" className="flex flex-col items-center gap-1 text-xs text-slate-600">
          <Phone className="h-5 w-5" /> Call
        </a>
      </div>
    </div>
  )
}
