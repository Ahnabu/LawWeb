'use client'

import { useLanguage } from './LanguageProvider'

const labels = {
  en: { label: 'EN', icon: '🇬🇧' },
  bn: { label: 'বাংলা', icon: '🇧🇩' },
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage()
  const nextLocale = locale === 'en' ? 'bn' : 'en'

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      className="rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-on-surface-variant shadow-sm transition hover:border-secondary hover:text-secondary"
      aria-label={t('common.language')}
    >
      <span className="mr-2">{labels[locale].icon}</span>
      {labels[locale].label}
    </button>
  )
}
