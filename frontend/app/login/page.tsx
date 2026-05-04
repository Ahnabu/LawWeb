"use client"

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LanguageToggle } from '../../components/LanguageToggle'
import { signIn } from '../../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const data = await signIn(email, password)

      router.push(`/dashboard/${data.user.role}`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to login right now'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.16),transparent_30%),linear-gradient(180deg,#0A1628_0%,#0A1628_35%,var(--clr-surface)_100%)] px-6 py-20 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl card-elevated p-10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Islam & Associates</p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-on-surface">Login to Your Account</h1>
          </div>
          <LanguageToggle />
        </div>
        <div className="mt-10 grid gap-6 rounded-xl border border-outline-variant bg-surface-container p-8">
          {/* Role tabs removed — users are redirected to their registered dashboard automatically */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-on-surface-variant">
              Email Address
              <input
                type="email"
                placeholder="admin@lawweb.com"
                className="mt-2 w-full"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium text-on-surface-variant">
              Password
              <input
                type="password"
                placeholder="••••••••"
                className="mt-2 w-full"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}
            <button type="submit" className="w-full rounded-md bg-secondary px-6 py-4 text-sm font-semibold text-primary transition hover:bg-secondary/90">
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <div className="flex items-center justify-between text-sm text-on-surface-variant">
            <Link href="#" className="text-secondary hover:text-secondary/80">Forgot Password?</Link>
            <span>Invite-only access only</span>
          </div>
        </div>
      </div>
    </main>
  )
}
