import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface AuthShellProps {
  backHref: string
  backLabel: string
  /** Wider card for longer forms (register) */
  wide?: boolean
  children: React.ReactNode
}

// Shared frame for login / register / password / verify pages: a short navy
// band with the firm mark, and one paper card overlapping it.
export function AuthShell({ backHref, backLabel, wide = false, children }: AuthShellProps) {
  return (
    <main className="auth-page relative min-h-svh bg-surface">
      <div aria-hidden="true" className="page-hero absolute inset-x-0 top-0 h-44 sm:h-52" />
      <div className={`relative mx-auto w-full px-4 pb-12 pt-5 sm:pt-8 ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 text-white">
            <span className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/20">
              <Image src="/logo.jpg" alt="" width={36} height={36} className="h-full w-full object-cover" />
            </span>
            <span className="truncate font-display text-sm font-bold sm:text-base">Islam &amp; Associates</span>
          </Link>
          <Link
            href={backHref}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
        <div className="card mt-8 p-6 sm:mt-10 sm:p-8">{children}</div>
      </div>
    </main>
  )
}
