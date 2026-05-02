'use client'

import { useEffect, useState } from 'react'

const labels = {
  en: { label: 'EN', full: 'English', icon: '🇬🇧' },
  bn: { label: 'বাংলা', full: 'বাংলা', icon: '🇧🇩' },
}

export function LanguageToggle() {
  const [locale, setLocale] = useState<'en' | 'bn'>('en')

  useEffect(() => {
    const stored = window.localStorage.getItem('lawweb-lang')
    if (stored === 'bn' || stored === 'en') setLocale(stored)
  }, [])

  const toggle = () => {
    const next = locale === 'en' ? 'bn' : 'en'
    setLocale(next)
    window.localStorage.setItem('lawweb-lang', next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-slate-300/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-amber-500"
      aria-label="Toggle language"
    >
      <span className="mr-2">{labels[locale].icon}</span>
      {labels[locale].label}
    </button>
  )
}
