'use client'

import { useId } from 'react'
import { useLanguage } from './LanguageProvider'

const labels = {
  en: 'EN',
  bn: 'বাংলা',
}

// Inline SVG flags — Windows doesn't render flag emoji (shows "GB" instead).
function UkFlag() {
  const clipId = useId()
  return (
    <svg viewBox="0 0 60 30" className="h-3.5 w-5 rounded-[2px]" aria-hidden="true">
      <clipPath id={clipId}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clipId})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}

function BdFlag() {
  return (
    <svg viewBox="0 0 10 6" className="h-3.5 w-5 rounded-[2px]" aria-hidden="true">
      <rect width="10" height="6" fill="#006A4E" />
      <circle cx="4.5" cy="3" r="2" fill="#F42A41" />
    </svg>
  )
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage()
  const nextLocale = locale === 'en' ? 'bn' : 'en'

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
      aria-label={t('common.language')}
    >
      {locale === 'en' ? <UkFlag /> : <BdFlag />}
      {labels[locale]}
    </button>
  )
}
