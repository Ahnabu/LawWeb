'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { API_BASE_URL } from '../lib/api'
import {
  CONSULTATION_TYPES,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  MEETING_MODES,
  businessToday,
  formatAvailableDays,
  formatDateLabel,
  useLawyerSchedule,
  type BookableLawyer,
} from '../lib/booking'
import { useAuth } from './AuthProvider'
import { apiFetch } from '../lib/http'
import { formatFee } from '../lib/fees'

// In-progress form kept across the login round trip
const DRAFT_KEY = 'appointmentDraft'
const PAGE_PATH = '/appointment'

// "You're signed in as …" for accounts that cannot book
const WRONG_ROLE_LABELS: Record<string, string> = {
  admin: 'an admin',
  lawyer: 'a lawyer',
  staff: 'a staff member',
}

const EMPTY_FORM = {
  lawyerId: '',
  consultationType: 'initial-consultation',
  meetingMode: 'in-person',
  date: '',
  time: '',
  subject: '',
  description: '',
  clientPhone: '',
  whatsappDocSharing: false,
  whatsappDocNote: '',
}

type BookingForm = typeof EMPTY_FORM

interface BookedSummary {
  lawyerName: string
  date: string
  time: string
  meetingMode: string
}

const readDraft = (): Partial<BookingForm> | null => {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(DRAFT_KEY)
    return JSON.parse(raw) as Partial<BookingForm>
  } catch {
    return null
  }
}

const saveDraft = (form: BookingForm) => {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form))
  } catch {
    // Storage unavailable (private mode etc.): the user just re-enters the form
  }
}

export function AppointmentBookingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedLawyerId = searchParams.get('lawyerId') ?? ''
  const { user, status, setPostAuthRedirect } = useAuth()

  const [lawyers, setLawyers] = useState<BookableLawyer[]>([])
  const [lawyersLoading, setLawyersLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})
  const [form, setForm] = useState<BookingForm>({ ...EMPTY_FORM, lawyerId: preselectedLawyerId })
  const selectedFee = formatFee(lawyers.find((l) => l._id === form.lawyerId)?.consultationFee)
  const [booked, setBooked] = useState<BookedSummary | null>(null)
  const phonePrefilled = useRef(false)
  const confirmationRef = useRef<HTMLDivElement>(null)

  const minDate = businessToday()
  const isClient = user?.role === 'client'
  const wrongRole = status === 'authenticated' && !isClient

  const {
    availability,
    availabilityLoading,
    isDateDisabled,
    dayOff,
    timeSlots,
    slotsReady,
    slotsLoading,
    reloadSlots,
  } = useLawyerSchedule(form.lawyerId, form.date)

  // Restore a form saved before the login redirect; an explicit ?lawyerId= wins
  useEffect(() => {
    const draft = readDraft()
    if (draft) {
      setForm((f) => ({ ...f, ...draft, lawyerId: preselectedLawyerId || draft.lawyerId || f.lawyerId }))
    }
  }, [preselectedLawyerId])

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/lawyers/public`)
      .then((r) => r.json())
      .then((d) => setLawyers(d.lawyers || []))
      .catch(() => toast.error('Unable to load lawyers. Please try again.'))
      .finally(() => setLawyersLoading(false))
  }, [])

  // Drop a preselected/restored lawyer that isn't in the bookable list
  useEffect(() => {
    if (lawyersLoading || !form.lawyerId) return
    if (!lawyers.some((l) => l._id === form.lawyerId)) {
      setForm((f) => ({ ...f, lawyerId: '', date: '', time: '' }))
    }
  }, [lawyers, lawyersLoading, form.lawyerId])

  useEffect(() => {
    if (!isClient || phonePrefilled.current) return
    phonePrefilled.current = true
    if (user?.phone) setForm((f) => (f.clientPhone ? f : { ...f, clientPhone: user.phone ?? '' }))
  }, [isClient, user])

  // Keep the chosen time only while it's still a free slot for this lawyer/date
  // (this also lets a restored draft keep its time).
  useEffect(() => {
    if (!form.time) return
    if (!form.date || (slotsReady && !timeSlots.some((t) => t.time === form.time && t.available))) {
      setForm((f) => ({ ...f, time: '' }))
    }
  }, [form.date, form.time, slotsReady, timeSlots])

  useEffect(() => {
    if (booked) confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [booked])

  const setField = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const goToLogin = () => {
    saveDraft(form)
    setPostAuthRedirect(PAGE_PATH)
    router.push(`/login?redirect=${encodeURIComponent(PAGE_PATH)}`)
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.lawyerId) errors.lawyerId = 'Please select a lawyer'
    if (!form.date) {
      errors.date = 'Please select a date'
    } else if (form.date < minDate) {
      errors.date = 'Please select a future date'
    } else if (isDateDisabled(form.date)) {
      errors.date = 'The lawyer is not available on this day'
    }
    if (!form.time) errors.time = 'Please select a time slot'
    if (!form.subject.trim()) errors.subject = 'Please enter your legal issue'
    if (form.description.trim().length < DESCRIPTION_MIN)
      errors.description = `Description must be at least ${DESCRIPTION_MIN} characters`
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'loading' || wrongRole) return
    if (status === 'unauthenticated') {
      goToLogin()
      return
    }

    setFieldErrors({})
    if (!validate()) return

    setSubmitting(true)
    const toastId = toast.loading('Booking consultation...')
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/consultations/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          subject: form.subject.trim(),
          description: form.description.trim(),
          clientPhone: form.clientPhone.trim() || undefined,
          whatsappDocNote: form.whatsappDocSharing ? form.whatsappDocNote : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        // Session expired since the page loaded: keep the form and log in again
        toast.error('Please log in again to book.', { id: toastId })
        goToLogin()
        return
      }
      if (!res.ok) {
        // Slot was taken (or passed) since the list loaded: refresh it so the user can pick again
        if (res.status === 409 || res.status === 400) {
          setField('time', '')
          reloadSlots()
        }
        throw new Error(data.message || 'Failed to book consultation')
      }
      toast.success('Consultation booked successfully!', { id: toastId })
      setBooked({
        lawyerName: lawyers.find((l) => l._id === form.lawyerId)?.name ?? 'your lawyer',
        date: form.date,
        time: form.time,
        meetingMode: MEETING_MODES.find((m) => m.value === form.meetingMode)?.label ?? form.meetingMode,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to book consultation', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  const bookAnother = () => {
    setBooked(null)
    setFieldErrors({})
    setForm((f) => ({ ...EMPTY_FORM, clientPhone: f.clientPhone }))
  }

  if (booked) {
    return (
      <div ref={confirmationRef} className="card scroll-mt-24 p-5 sm:p-8">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmation
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-heading">Your consultation is booked.</h2>
        <dl className="panel mt-6 grid gap-4 p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-on-surface-variant">Lawyer</dt>
            <dd className="mt-1 font-semibold text-on-surface">{booked.lawyerName}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Date</dt>
            <dd className="mt-1 font-semibold text-on-surface">{formatDateLabel(booked.date)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Time</dt>
            <dd className="mt-1 font-semibold text-on-surface">{booked.time} · {booked.meetingMode}</dd>
          </div>
        </dl>
        <p className="mt-6 max-w-prose text-sm leading-7 text-on-surface-variant">
          {booked.lawyerName} will review and confirm your appointment. You can follow its status, and
          get notified once it&apos;s confirmed, from your appointments dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/client/appointments"
            className="btn btn-primary"
          >
            View My Appointments
          </Link>
          <button
            type="button"
            onClick={bookAnother}
            className="btn btn-secondary"
          >
            Book Another Consultation
          </button>
        </div>
      </div>
    )
  }

  const hasFreeSlot = timeSlots.some((t) => t.available)
  const submitLabel = submitting
    ? 'Booking...'
    : status === 'unauthenticated'
      ? 'Log in to book'
      : 'Submit Appointment Request'

  return (
    <div className="card p-5 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Identity comes from the session, not the form */}
        {status === 'unauthenticated' && (
          <div className="notice notice-info">
            Bookings are made from a client account. Fill in the form, and you&apos;ll be asked to log in (or{' '}
            <Link href={`/register?redirect=${encodeURIComponent(PAGE_PATH)}`} className="text-link">
              create an account
            </Link>
            ) when you submit. Your answers are kept.
          </div>
        )}
        {wrongRole && (
          <div className="notice notice-error">
            Only client accounts can book consultations. You&apos;re signed in as {WRONG_ROLE_LABELS[user?.role ?? ''] ?? 'a firm account'}.
          </div>
        )}
        {isClient && user && (
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block text-sm font-semibold text-on-surface">
              Full Name
              <input type="text" value={user.name} readOnly disabled className="field mt-1.5" />
            </label>
            <label className="block text-sm font-semibold text-on-surface">
              Email Address
              <input type="email" value={user.email} readOnly disabled className="field mt-1.5" />
            </label>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-on-surface">
              Select Lawyer *
              <select
                value={form.lawyerId}
                disabled={lawyersLoading}
                onChange={(e) => {
                  setField('lawyerId', e.target.value)
                  setField('date', '')
                  setField('time', '')
                }}
                className={`field mt-1.5 ${fieldErrors.lawyerId ? 'field-invalid' : ''}`}
              >
                <option value="">
                  {lawyersLoading ? 'Loading lawyers...' : lawyers.length ? 'Choose a lawyer...' : 'No lawyers available'}
                </option>
                {lawyers.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                    {l.specialization ? ` — ${l.specialization}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {fieldErrors.lawyerId && <p className="text-xs text-error">{fieldErrors.lawyerId}</p>}
            {selectedFee && <p className="text-xs text-on-surface-variant">Consultation fee: <span className="font-semibold text-on-surface tabular-nums">{selectedFee}</span></p>}
            {availabilityLoading && <p className="text-xs text-on-surface-variant">Loading availability...</p>}
            {availability && (
              <p className="text-xs text-success">
                Available: {formatAvailableDays(availability) || 'No days set'}
              </p>
            )}
            {availability && !availability.isAcceptingNewClients && (
              <p className="text-xs text-error">Not accepting new clients — existing clients can still book.</p>
            )}
          </div>
          <label className="block text-sm font-semibold text-on-surface">
            Consultation Type *
            <select
              value={form.consultationType}
              onChange={(e) => setField('consultationType', e.target.value)}
              className="field mt-1.5"
            >
              {CONSULTATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-on-surface">
              Preferred Date *
              <input
                type="date"
                min={minDate}
                value={form.date}
                disabled={!form.lawyerId}
                onChange={(e) => setField('date', e.target.value)}
                className={`field mt-1.5 ${fieldErrors.date ? 'field-invalid' : ''}`}
              />
            </label>
            {fieldErrors.date && <p className="text-xs text-error">{fieldErrors.date}</p>}
            {!fieldErrors.date && form.date && form.date < minDate && (
              <p className="text-xs text-error">Please choose today or a later date.</p>
            )}
            {!fieldErrors.date && dayOff && (
              <p className="text-xs text-error">The lawyer is unavailable on this day. Please choose another date.</p>
            )}
          </div>
          <label className="block text-sm font-semibold text-on-surface">
            Consultation Mode *
            <select
              value={form.meetingMode}
              onChange={(e) => setField('meetingMode', e.target.value)}
              className="field mt-1.5"
            >
              {MEETING_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="panel space-y-3 p-4 text-sm text-on-surface-variant">
          <legend className="px-1 text-sm font-semibold text-on-surface">Preferred Time Slot *</legend>
          {!form.lawyerId || !form.date ? (
            <p>Select a lawyer and date to see open times.</p>
          ) : dayOff ? (
            <p>No slots on this day.</p>
          ) : slotsLoading || !slotsReady ? (
            <p>Loading time slots...</p>
          ) : !timeSlots.length ? (
            <p>No time slots available on this date.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {timeSlots.map((slot) => {
                  const selected = form.time === slot.time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      aria-pressed={selected}
                      onClick={() => setField('time', slot.time)}
                      className="chip disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {slot.time}
                      {slot.reason === 'booked' ? ' · Booked' : slot.reason === 'past' ? ' · Passed' : ''}
                    </button>
                  )
                })}
              </div>
              {!hasFreeSlot && <p>All slots on this date are taken. Please choose another date.</p>}
            </>
          )}
          {fieldErrors.time && <p className="text-xs text-error">{fieldErrors.time}</p>}
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-on-surface">
            Practice Area / Legal Issue *
            <input
              type="text"
              maxLength={120}
              placeholder="e.g. Property dispute, Immigration, Contract review"
              value={form.subject}
              onChange={(e) => setField('subject', e.target.value)}
              className={`field mt-1.5 ${fieldErrors.subject ? 'field-invalid' : ''}`}
            />
          </label>
          {fieldErrors.subject && <p className="text-xs text-error">{fieldErrors.subject}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-on-surface">
            Brief Description of Issue *
            <textarea
              rows={4}
              maxLength={DESCRIPTION_MAX}
              placeholder="Describe your legal matter"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className={`field mt-1.5 ${fieldErrors.description ? 'field-invalid' : ''}`}
            />
          </label>
          <p className="text-xs text-on-surface-variant">{form.description.length}/{DESCRIPTION_MAX}</p>
          {fieldErrors.description && <p className="text-xs text-error">{fieldErrors.description}</p>}
        </div>

        <label className="block text-sm font-semibold text-on-surface">
          Phone Number
          <input
            type="tel"
            placeholder="+880 17XXXXXXXX"
            value={form.clientPhone}
            onChange={(e) => setField('clientPhone', e.target.value)}
            className="field mt-1.5"
          />
        </label>

        <div className="panel space-y-3 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.whatsappDocSharing}
              onChange={(e) => setField('whatsappDocSharing', e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm text-on-surface">I plan to share case documents with the lawyer via WhatsApp</span>
          </label>
          {form.whatsappDocSharing && (
            <label className="block text-sm font-semibold text-on-surface">
              Document note (optional)
              <input
                type="text"
                placeholder="e.g. ID documents, property deed, contract"
                value={form.whatsappDocNote}
                onChange={(e) => setField('whatsappDocNote', e.target.value)}
                className="field mt-1.5"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || status === 'loading' || wrongRole}
          className="btn btn-primary btn-lg btn-block"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  )
}
