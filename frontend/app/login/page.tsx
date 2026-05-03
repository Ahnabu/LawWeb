import Link from 'next/link'
import { LanguageToggle } from '../../components/LanguageToggle'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.16),_transparent_30%),linear-gradient(180deg,_#0A1628_0%,_#0A1628_35%,_var(--clr-surface)_100%)] px-6 py-20 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl card-elevated p-10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Islam & Associates</p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-on-surface">Login to Your Account</h1>
          </div>
          <LanguageToggle />
        </div>
        <div className="mt-10 grid gap-6 rounded-xl border border-outline-variant bg-surface-container p-8">
          <div className="flex gap-3 rounded-lg bg-surface p-2 shadow-sm">
            {['Owner / Admin', 'Lawyer', 'Client'].map((role) => (
              <button key={role} type="button" className="flex-1 rounded-md px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-gold/10 hover:text-gold">
                {role}
              </button>
            ))}
          </div>
          <form className="space-y-5">
            <label className="block text-sm font-medium text-on-surface-variant">
              Email Address
              <input type="email" placeholder="admin@lawweb.com" className="mt-2 w-full" />
            </label>
            <label className="block text-sm font-medium text-on-surface-variant">
              Password
              <input type="password" placeholder="••••••••" className="mt-2 w-full" />
            </label>
            <button type="submit" className="w-full rounded-md bg-gold px-6 py-4 text-sm font-semibold text-navy transition hover:bg-gold/90">
              Login
            </button>
          </form>
          <div className="flex items-center justify-between text-sm text-on-surface-variant">
            <Link href="#" className="text-gold hover:text-gold/80">Forgot Password?</Link>
            <span>Invite-only access only</span>
          </div>
        </div>
      </div>
    </main>
  )
}
