"use client"

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { LanguageToggle } from '../../components/LanguageToggle'
import { signUp } from '../../lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'client' | 'lawyer'>('client')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [barId, setBarId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
    phone?: string
    barId?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  // Calculate password strength
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[@$!%*?&]/.test(pwd)) strength++
    setPasswordStrength(strength)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value
    setPassword(pwd)
    calculatePasswordStrength(pwd)
  }

  const validateForm = () => {
    const nextFieldErrors: typeof fieldErrors = {}

    const fail = (field: keyof typeof fieldErrors, message: string) => {
      nextFieldErrors[field] = message
      setFieldErrors(nextFieldErrors)
      return false
    }

    if (!name.trim()) {
      return fail('name', 'Name is required')
    }
    if (name.length < 2) {
      return fail('name', 'Name must be at least 2 characters')
    }
    if (!email.trim()) {
      return fail('email', 'Email is required')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail('email', 'Invalid email format')
    }
    if (!password) {
      return fail('password', 'Password is required')
    }
    if (password.length < 8) {
      return fail('password', 'Password must be at least 8 characters')
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[@$!%*?&]/.test(password)) {
      return fail('password', 'Password must contain uppercase, lowercase, number and special character')
    }
    if (password !== confirmPassword) {
      return fail('confirmPassword', 'Passwords do not match')
    }
    if (role === 'lawyer' && !barId.trim()) {
      return fail('barId', 'Bar ID is required for lawyers')
    }
    if (!phone.trim()) {
      return fail('phone', 'Phone number is required')
    }
    if (!/^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/.test(phone.replace(/[\s\-()]/g, ''))) {
      return fail('phone', 'Enter a valid Bangladeshi phone number, such as +8801XXXXXXXXX')
    }

    setFieldErrors(nextFieldErrors)
    return true
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      await signUp(name.trim(), normalizedEmail, password, role, phone.trim(), role === 'lawyer' ? barId.trim() : undefined)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pendingVerificationEmail', normalizedEmail)
      }
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to register right now'
      setError(message)

      if (message.toLowerCase().includes('already exists')) {
        setFieldErrors((current) => ({ ...current, email: 'This email is already registered' }))
      }

      if (message.toLowerCase().includes('phone')) {
        setFieldErrors((current) => ({ ...current, phone: message }))
      }

      if (message.toLowerCase().includes('bar id')) {
        setFieldErrors((current) => ({ ...current, barId: message }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500'
    if (passwordStrength <= 2) return 'bg-orange-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    if (passwordStrength <= 4) return 'bg-lime-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (!password) return ''
    if (passwordStrength <= 1) return 'Weak'
    if (passwordStrength <= 2) return 'Fair'
    if (passwordStrength <= 3) return 'Good'
    if (passwordStrength <= 4) return 'Strong'
    return 'Very Strong'
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.18),transparent_28%),linear-gradient(180deg,#07111f_0%,#0A1628_30%,var(--clr-surface)_100%)] px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="card-elevated flex flex-col justify-between gap-8 overflow-hidden rounded-3xl p-6 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-secondary sm:text-xs">Islam & Associates</p>
              <h1 className="mt-3 max-w-xl font-display text-3xl leading-tight text-on-surface sm:text-4xl lg:text-5xl">
                Create your account and verify your email in minutes.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-on-surface-variant sm:text-base">
                Choose your role, complete your details, and we will email a verification code before activating the account.
              </p>
            </div>
            <LanguageToggle />
          </div>

          <div className="grid gap-4 rounded-2xl border border-outline-variant/70 bg-surface-container/90 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-secondary">Step 1</p>
              <p className="mt-2 text-sm text-on-surface-variant">Enter your profile details.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-secondary">Step 2</p>
              <p className="mt-2 text-sm text-on-surface-variant">Receive a verification code by email.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-secondary">Step 3</p>
              <p className="mt-2 text-sm text-on-surface-variant">Verify and access your dashboard.</p>
            </div>
          </div>
        </section>

        <section className="card-elevated rounded-3xl p-4 backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="grid gap-6 rounded-2xl border border-outline-variant bg-surface-container p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Create Account</p>
                <h2 className="mt-2 font-display text-2xl text-on-surface sm:text-3xl">Register securely</h2>
              </div>
              <p className="text-sm text-on-surface-variant">Lawyer registration requires a Bar ID.</p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-surface-dim p-2 sm:flex-row">
            {(['client', 'lawyer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r)
                  setError(null)
                  setBarId('')
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  role === r
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-bright'
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
            </div>

            {error && (
              <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-on-surface-variant sm:col-span-2">
                  Full Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      clearFieldError('name')
                    }}
                      className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.name ? 'border-error' : 'border-outline'}`}
                    placeholder="John Doe"
                    disabled={isSubmitting}
                  />
                    {fieldErrors.name && <p className="mt-2 text-xs text-error">{fieldErrors.name}</p>}
                </label>

                <label className="block text-sm font-medium text-on-surface-variant sm:col-span-2">
                  Email Address
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      clearFieldError('email')
                    }}
                    className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.email ? 'border-error' : 'border-outline'}`}
                    placeholder="john@example.com"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.email && <p className="mt-2 text-xs text-error">{fieldErrors.email}</p>}
                </label>

                <label className="block text-sm font-medium text-on-surface-variant sm:col-span-2">
                  Password
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        handlePasswordChange(e)
                        clearFieldError('password')
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      className={`block w-full rounded-xl border bg-surface px-4 py-3.5 pr-12 text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.password ? 'border-error' : 'border-outline'}`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant transition hover:text-primary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {password && isPasswordFocused && (
                    <div className="mt-3 space-y-2 rounded-xl border border-outline-variant/60 bg-surface/70 p-4">
                      <div className="flex h-2 gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-colors ${
                              i < passwordStrength ? getPasswordStrengthColor() : 'bg-outline-variant'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Strength: <span className="font-semibold">{getPasswordStrengthText()}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        • At least 8 characters {password.length >= 8 ? '✓' : ''}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        • Uppercase & lowercase letters {/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : ''}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        • Number {/\d/.test(password) ? '✓' : ''}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        • Special character (@$!%*?&) {/@$!%*?&/.test(password) ? '✓' : ''}
                      </p>
                    </div>
                  )}
                  {fieldErrors.password && <p className="mt-2 text-xs text-error">{fieldErrors.password}</p>}
                </label>

                <label className="block text-sm font-medium text-on-surface-variant sm:col-span-2">
                  Confirm Password
                  <div className="relative mt-2">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearFieldError('confirmPassword')
                      }}
                      className={`block w-full rounded-xl border bg-surface px-4 py-3.5 pr-12 text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.confirmPassword ? 'border-error' : 'border-outline'}`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant transition hover:text-primary"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-2 text-xs text-error">{fieldErrors.confirmPassword}</p>}
                </label>

                <label className="block text-sm font-medium text-on-surface-variant sm:col-span-2">
                  Phone Number <span className="text-error">*</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      clearFieldError('phone')
                    }}
                    required
                    className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.phone ? 'border-error' : 'border-outline'}`}
                    placeholder="+8801XXXXXXXXX"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.phone ? (
                    <p className="mt-2 text-xs text-error">{fieldErrors.phone}</p>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-on-surface-variant">Use a valid Bangladeshi number like +8801712345678.</p>
                  )}
                </label>

                {role === 'lawyer' && (
                  <label className="block text-sm font-medium text-on-surface-variant sm:col-span-2">
                    Bar ID <span className="text-error">*</span>
                    <input
                      type="text"
                      value={barId}
                      onChange={(e) => {
                        setBarId(e.target.value)
                        clearFieldError('barId')
                      }}
                      className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface placeholder-on-surface-variant outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${fieldErrors.barId ? 'border-error' : 'border-outline'}`}
                      placeholder="Your bar registration number"
                      disabled={isSubmitting}
                    />
                    {fieldErrors.barId && <p className="mt-2 text-xs text-error">{fieldErrors.barId}</p>}
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-95 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm leading-6 text-on-surface-variant">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-secondary underline decoration-2 underline-offset-4 hover:text-primary">
                  Sign in here
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
