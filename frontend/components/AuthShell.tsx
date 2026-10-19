import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'

interface AuthShellProps {
  backHref: string
  backLabel: string
  /** Wider card for longer forms (register) */
  wide?: boolean
  /** Extra content for the desktop brand panel (e.g. the sign-up steps) */
  aside?: React.ReactNode
  children: React.ReactNode
}

const defaultPoints = [
  'Book consultations with the firm’s lawyers',
  'Follow your case progress in one place',
  'Confidential, verified accounts only',
]

function FirmMark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 text-white">
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-md border border-white/20 ${
          size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
        }`}
      >
        <Image src="/logo.jpg" alt="" width={44} height={44} className="h-full w-full object-cover" />
      </span>
      <span className={`truncate font-display font-bold ${size === 'lg' ? 'text-lg' : 'text-sm sm:text-base'}`}>
        Islam &amp; Associates
      </span>
    </Link>
  )
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      {label}
    </Link>
  )
}

// Shared frame for login / register / password / verify pages.
// Phones: a short navy band with the firm mark and one paper card overlapping it.
// Desktop: a split screen sized to the viewport, so the form never needs the
// page to scroll; only the form column scrolls on unusually short screens.
export function AuthShell({ backHref, backLabel, wide = false, aside, children }: AuthShellProps) {
  return (
    <main className="auth-page relative min-h-svh bg-surface lg:grid lg:h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:overflow-hidden">
      {/* Desktop brand panel */}
      <aside className="page-hero hidden flex-col justify-between gap-8 overflow-hidden border-b-0 border-r border-r-secondary/30 px-10 py-10 lg:flex xl:px-14">
        <FirmMark size="lg" />
        <div className="max-w-md">
          <p className="text-sm font-semibold text-secondary">Islam &amp; Associates International</p>
          <p className="mt-3 font-display text-3xl font-semibold leading-tight text-white xl:text-[2.1rem]">
            Trusted legal counsel, from first consultation to final verdict.
          </p>
          {aside ?? (
            <ul className="mt-8 space-y-3">
              {defaultPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-6 text-white/80">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-secondary" />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} Islam &amp; Associates International</p>
      </aside>

      {/* Phone band */}
      <div aria-hidden="true" className="page-hero absolute inset-x-0 top-0 h-44 sm:h-52 lg:hidden" />

      <div className="relative flex flex-col lg:overflow-y-auto">
        <div className={`mx-auto flex w-full items-center justify-between gap-3 px-4 pt-5 sm:pt-8 lg:hidden ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <FirmMark />
          <BackLink href={backHref} label={backLabel} />
        </div>
        <div className="absolute right-6 top-3 z-10 hidden lg:block">
          <Link
            href={backHref}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>

        <div className={`mx-auto w-full px-4 pb-12 lg:my-auto lg:px-8 lg:pb-4 lg:pt-12 ${wide ? 'max-w-xl lg:max-w-2xl' : 'max-w-md lg:max-w-xl'}`}>
          <div className="card mt-8 p-6 sm:mt-10 sm:p-8 lg:mt-0 lg:px-9 lg:py-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
