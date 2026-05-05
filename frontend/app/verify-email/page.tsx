"use client"

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LanguageToggle } from '../../components/LanguageToggle'
import { useAuth } from '../../components/AuthProvider'
import { resendVerificationCode, verifyEmail } from '../../lib/auth'

export default function VerifyEmailPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    code?: string
  }>({})
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    const storedEmail = window.localStorage.getItem('pendingVerificationEmail')

    if (emailParam && emailParam !== 'undefined') {
      setEmail(emailParam)
      window.localStorage.setItem('pendingVerificationEmail', emailParam)
      return
    }

    if (storedEmail) {
      setEmail(storedEmail)
      return
    }
  }, [])

  const validateForm = () => {
    const nextFieldErrors: typeof fieldErrors = {}

    if (!email.trim()) {
      nextFieldErrors.email = 'Email is required'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextFieldErrors.email = 'Enter a valid email address'
    }

    if (!/^\d{6}$/.test(code)) {
      nextFieldErrors.code = 'Enter the 6-digit code from your email'
    }

    setFieldErrors(nextFieldErrors)
    return Object.keys(nextFieldErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = await verifyEmail(email, code)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pendingVerificationEmail')
      }
      login(data.user)
      router.push(`/dashboard/${data.user.role}`)
    } catch (submitError) {
      const text = submitError instanceof Error ? submitError.message : 'Unable to verify right now'
      setError(text)

      const lowerText = text.toLowerCase()
      if (lowerText.includes('email')) {
        setFieldErrors((current) => ({ ...current, email: text }))
      }
      if (lowerText.includes('code') || lowerText.includes('verification')) {
        setFieldErrors((current) => ({ ...current, code: text }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setMessage(null)
    setFieldErrors((current) => ({ ...current, email: undefined }))

    if (!email.trim()) {
      setFieldErrors((current) => ({ ...current, email: 'Email is required to resend the code' }))
      return
    }

    setIsResending(true)

    try {
      const result = await resendVerificationCode(email)
      setMessage(result.message)
    } catch (resendError) {
      const text = resendError instanceof Error ? resendError.message : 'Unable to resend the code'
      setError(text)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),transparent_28%),linear-gradient(180deg,#07111f_0%,#0A1628_30%,var(--clr-surface)_100%)] px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <section className="card-elevated overflow-hidden rounded-3xl p-6 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-secondary sm:text-xs">Verify Email</p>
              <h1 className="mt-3 max-w-lg font-display text-3xl leading-tight text-on-surface sm:text-4xl lg:text-5xl">
                Enter the code sent to your inbox.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-on-surface-variant sm:text-base">
                We send a 6-digit verification code for every new account. Use the same email you registered with.
              </p>
            </div>
            <LanguageToggle />
          </div>

          <div className="mt-8 rounded-2xl border border-outline-variant/70 bg-surface-container/90 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-secondary">What happens next</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
              <li>• Enter your email and the 6-digit code.</li>
              <li>• We will activate your account as soon as the code matches.</li>
              <li>• If the code expires, use resend to get a new one.</li>
            </ul>
          </div>
        </section>

        <section className="card-elevated rounded-3xl p-4 backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="grid gap-6 rounded-2xl border border-outline-variant bg-surface-container p-5 sm:p-6 lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Account Activation</p>
              <h2 className="mt-2 font-display text-2xl text-on-surface sm:text-3xl">Verify your account</h2>
            </div>

            {error && (
              <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-on-surface">
                {message}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-on-surface-variant">
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                  }}
                  className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.email ? 'border-error' : 'border-outline'}`}
                  placeholder="john@example.com"
                  required
                  autoComplete="email"
                />
                {fieldErrors.email && <p className="mt-2 text-xs text-error">{fieldErrors.email}</p>}
              </label>

              <label className="block text-sm font-medium text-on-surface-variant">
                Verification Code
                <input
                  type="text"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setFieldErrors((current) => ({ ...current, code: undefined }))
                  }}
                  className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-center tracking-[0.35em] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.code ? 'border-error' : 'border-outline'}`}
                  placeholder="123456"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                {fieldErrors.code && <p className="mt-2 text-xs text-error">{fieldErrors.code}</p>}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-px hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="grid gap-3 rounded-2xl bg-surface-dim p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || !email.trim()}
                className="rounded-xl border border-outline px-4 py-3 text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
              <Link
                href="/login"
                className="rounded-xl border border-outline px-4 py-3 text-center text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
