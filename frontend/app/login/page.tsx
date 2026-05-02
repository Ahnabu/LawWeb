import Link from 'next/link'
import { LanguageToggle } from '../../components/LanguageToggle'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(201,168,76,0.16),_transparent_30%),linear-gradient(180deg,_#0A1628_0%,_#0A1628_35%,_#F5F0E8_100%)] px-6 py-20 text-slate-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[3rem] bg-white/95 p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Islam & Associates</p>
            <h1 className="mt-4 text-4xl font-semibold text-primary">Login to Your Account</h1>
          </div>
          <LanguageToggle />
        </div>
        <div className="mt-10 grid gap-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-inner">
          <div className="flex gap-3 rounded-full bg-white p-2 shadow-sm">
            {['Owner / Admin', 'Lawyer', 'Client'].map((role) => (
              <button key={role} type="button" className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-amber-50">
                {role}
              </button>
            ))}
          </div>
          <form className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Email Address
              <input type="email" placeholder="admin@lawweb.com" className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input type="password" placeholder="••••••••" className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
            </label>
            <button type="submit" className="w-full rounded-full bg-amber-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-amber-600">
              Login
            </button>
          </form>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <Link href="#" className="text-amber-700 hover:text-amber-900">Forgot Password?</Link>
            <span className="text-slate-500">Invite-only access only</span>
          </div>
        </div>
      </div>
    </main>
  )
}
