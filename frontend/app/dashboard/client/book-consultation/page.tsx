'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '../../../../components/Navbar'
import { Footer } from '../../../../components/Footer'
import { DashboardSidebar } from '../../../../components/DashboardSidebar'
import { AuthGate } from '../../../../components/AuthGate'
import { useAuth } from '../../../../components/AuthProvider'
import { API_BASE_URL } from '../../../../lib/api'

interface Lawyer {
  _id: string
  name: string
  email: string
  barId?: string
  phone?: string
  isVerified: boolean
}

interface TimeSlot {
  time: string
  available: boolean
}

const CONSULTATION_TYPES = [
  { value: 'initial-consultation', label: 'Initial Consultation' },
  { value: 'follow-up', label: 'Follow-up Session' },
  { value: 'document-review', label: 'Document Review' },
  { value: 'case-discussion', label: 'Case Discussion' },
]

const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00 AM', available: true },
  { time: '10:00 AM', available: true },
  { time: '11:00 AM', available: true },
  { time: '02:00 PM', available: true },
  { time: '03:00 PM', available: true },
  { time: '04:00 PM', available: true },
]

export default function BookConsultationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    lawyerId: '',
    consultationType: 'initial-consultation',
    date: '',
    time: '',
    subject: '',
    description: '',
  })

  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/api/lawyers`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch lawyers')
        }

        const data = await response.json()
        setLawyers(data.lawyers || [])
      } catch (err) {
        console.error('Error fetching lawyers:', err)
        setError('Unable to load lawyers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchLawyers()
  }, [])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.lawyerId.trim()) {
      errors.lawyerId = 'Please select a lawyer'
    }

    if (!formData.date.trim()) {
      errors.date = 'Please select a date'
    } else {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        errors.date = 'Please select a future date'
      }
    }

    if (!formData.time.trim()) {
      errors.time = 'Please select a time'
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Please enter a subject'
    }

    if (!formData.description.trim()) {
      errors.description = 'Please describe your consultation needs'
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/consultations/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          lawyerId: formData.lawyerId,
          consultationType: formData.consultationType,
          date: formData.date,
          time: formData.time,
          subject: formData.subject,
          description: formData.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book consultation')
      }

      router.push('/dashboard/client?success=consultation-booked')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to book consultation'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <AuthGate allowRoles={['client']}>
        <section className="px-6 pb-16 pt-6 sm:px-8 sm:pb-16 sm:pt-8 lg:px-10 lg:pb-16 lg:pt-10">
          <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
            <DashboardSidebar role="client" />
            <div className="space-y-8">
              <div className="card-elevated p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Book a Consultation</p>
                    <h1 className="mt-3 font-display text-3xl font-semibold text-on-surface">Schedule Your Session</h1>
                    <p className="mt-2 text-sm text-on-surface-variant">Connect with our experienced lawyers for professional legal guidance</p>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-8">
                {error && (
                  <div className="mb-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="space-y-4 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      <p className="text-sm text-on-surface-variant">Loading available lawyers...</p>
                    </div>
                  </div>
                ) : lawyers.length === 0 ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center">
                    <p className="text-on-surface-variant">No lawyers available at the moment. Please try again later.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Lawyer Selection */}
                    <label className="block">
                      <p className="text-sm font-medium text-on-surface-variant">
                        Select a Lawyer <span className="text-error">*</span>
                      </p>
                      <select
                        value={formData.lawyerId}
                        onChange={(e) => {
                          setFormData({ ...formData, lawyerId: e.target.value })
                          setFieldErrors((current) => ({ ...current, lawyerId: undefined }))
                        }}
                        className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
                          fieldErrors.lawyerId ? 'border-error' : 'border-outline'
                        }`}
                      >
                        <option value="">Choose a lawyer...</option>
                        {lawyers.map((lawyer) => (
                          <option key={lawyer._id} value={lawyer._id}>
                            {lawyer.name} {lawyer.barId ? `(Bar ID: ${lawyer.barId})` : ''}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.lawyerId && <p className="mt-2 text-xs text-error">{fieldErrors.lawyerId}</p>}
                    </label>

                    {/* Consultation Type */}
                    <label className="block">
                      <p className="text-sm font-medium text-on-surface-variant">
                        Consultation Type <span className="text-error">*</span>
                      </p>
                      <select
                        value={formData.consultationType}
                        onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })}
                        className="mt-2 block w-full rounded-xl border border-outline bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        {CONSULTATION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Date and Time in grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Date */}
                      <label className="block">
                        <p className="text-sm font-medium text-on-surface-variant">
                          Date <span className="text-error">*</span>
                        </p>
                        <input
                          type="date"
                          min={minDate}
                          value={formData.date}
                          onChange={(e) => {
                            setFormData({ ...formData, date: e.target.value })
                            setFieldErrors((current) => ({ ...current, date: undefined }))
                          }}
                          className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
                            fieldErrors.date ? 'border-error' : 'border-outline'
                          }`}
                        />
                        {fieldErrors.date && <p className="mt-2 text-xs text-error">{fieldErrors.date}</p>}
                      </label>

                      {/* Time Slot Selection */}
                      <label className="block">
                        <p className="text-sm font-medium text-on-surface-variant">
                          Time <span className="text-error">*</span>
                        </p>
                        <select
                          value={formData.time}
                          onChange={(e) => {
                            setFormData({ ...formData, time: e.target.value })
                            setFieldErrors((current) => ({ ...current, time: undefined }))
                          }}
                          className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
                            fieldErrors.time ? 'border-error' : 'border-outline'
                          }`}
                        >
                          <option value="">Select a time slot...</option>
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot.time} value={slot.time} disabled={!slot.available}>
                              {slot.time} {!slot.available ? '(Not Available)' : ''}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.time && <p className="mt-2 text-xs text-error">{fieldErrors.time}</p>}
                      </label>
                    </div>

                    {/* Subject */}
                    <label className="block">
                      <p className="text-sm font-medium text-on-surface-variant">
                        Subject <span className="text-error">*</span>
                      </p>
                      <input
                        type="text"
                        placeholder="e.g., Property Dispute, Contract Review"
                        value={formData.subject}
                        onChange={(e) => {
                          setFormData({ ...formData, subject: e.target.value })
                          setFieldErrors((current) => ({ ...current, subject: undefined }))
                        }}
                        className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
                          fieldErrors.subject ? 'border-error' : 'border-outline'
                        }`}
                      />
                      {fieldErrors.subject && <p className="mt-2 text-xs text-error">{fieldErrors.subject}</p>}
                    </label>

                    {/* Description */}
                    <label className="block">
                      <p className="text-sm font-medium text-on-surface-variant">
                        Description <span className="text-error">*</span>
                      </p>
                      <textarea
                        placeholder="Describe your legal matter in detail..."
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value })
                          setFieldErrors((current) => ({ ...current, description: undefined }))
                        }}
                        rows={5}
                        className={`mt-2 block w-full rounded-xl border bg-surface px-4 py-3.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
                          fieldErrors.description ? 'border-error' : 'border-outline'
                        }`}
                      />
                      <p className="mt-1 text-xs text-on-surface-variant">{formData.description.length}/500</p>
                      {fieldErrors.description && <p className="mt-2 text-xs text-error">{fieldErrors.description}</p>}
                    </label>

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={submitting || loading}
                        className="flex-1 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-px hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? 'Booking...' : 'Book Consultation'}
                      </button>
                      <Link
                        href="/dashboard/client"
                        className="rounded-xl border border-outline px-6 py-3.5 text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary"
                      >
                        Cancel
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </AuthGate>
      <Footer />
    </main>
  )
}
