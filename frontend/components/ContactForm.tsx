'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { API_BASE_URL } from '../lib/api'

// Contact page message form → POST /api/contact. Admins read the messages in
// Dashboard › Messages. Limits mirror contactMessageSchema on the backend.

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

const inputClass = 'field'

export function ContactForm() {
  const { t, locale } = useLanguage()
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Server messages are English only
        const serverMessage = data?.errors?.[0]?.message || data?.message
        setError(locale === 'en' && serverMessage ? serverMessage : t('contact.sendError'))
        return
      }
      setForm(EMPTY)
      setSent(true)
    } catch {
      setError(t('contact.sendError'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center" role="status">
        <CheckCircle2 className="h-9 w-9 text-success" aria-hidden="true" />
        <p className="mt-4 font-display text-xl font-semibold text-on-surface">{t('contact.successTitle')}</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-on-surface-variant">{t('contact.successText')}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="btn btn-secondary mt-6"
        >
          {t('contact.sendAnother')}
        </button>
      </div>
    )
  }

  const optional = <span className="font-normal text-on-surface-variant">({t('contact.optional')})</span>

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t('contact.nameLabel')}</span>
          <input
            type="text"
            value={form.name}
            onChange={update('name')}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="label">{t('contact.emailLabel')}</span>
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            required
            maxLength={254}
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="label">
            {t('contact.phoneLabel')} {optional}
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={update('phone')}
            maxLength={30}
            pattern="\+?[\d\s\-()]*"
            autoComplete="tel"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="label">
            {t('contact.subjectLabel')} {optional}
          </span>
          <input type="text" value={form.subject} onChange={update('subject')} maxLength={150} className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className="label">{t('contact.messageLabel')}</span>
        <textarea
          value={form.message}
          onChange={update('message')}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className={inputClass}
        />
      </label>

      {/* Honeypot: hidden from people and screen readers, filled in by bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
        </label>
      </div>

      <p className="text-xs leading-5 text-on-surface-variant">{t('contact.privacyNote')}</p>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="btn btn-primary btn-lg w-full sm:w-auto"
      >
        {sending ? t('contact.sending') : t('contact.send')}
      </button>
    </form>
  )
}
