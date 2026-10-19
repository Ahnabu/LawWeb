'use client'

import { MessageSquare } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { useSiteSettings } from './contentHooks'

export function AppointmentWidget() {
  const { t } = useLanguage()
  const { whatsappHref } = useSiteSettings()

  return (
    <aside className="card p-5 sm:p-6">
      <p className="text-sm font-semibold text-gold-ink">{t('common.quickBooking')}</p>
      <h2 className="mt-1 font-display text-xl font-semibold text-heading">{t('common.bookConsultation')}</h2>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{t('common.quickBookingText')}</p>
      <dl className="panel mt-5 divide-y divide-outline-variant text-sm">
        <div className="px-4 py-3">
          <dt className="text-on-surface-variant">{t('common.preferredService')}</dt>
          <dd className="mt-0.5 font-semibold text-on-surface">{t('common.preferredServiceValue')}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-on-surface-variant">{t('common.fastResponse')}</dt>
          <dd className="mt-0.5 font-semibold text-on-surface">{t('common.fastResponseValue')}</dd>
        </div>
      </dl>
      <a href={whatsappHref()} className="btn btn-secondary btn-block mt-5">
        <MessageSquare className="h-4 w-4 text-[#1fae55]" aria-hidden="true" /> {t('common.messageWhatsApp')}
      </a>
    </aside>
  )
}
