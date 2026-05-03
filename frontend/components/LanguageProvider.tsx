'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { availableLocales, defaultLocale, Locale, translate } from '../lib/i18n'

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key: string) => key,
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('lawweb-lang') as Locale | null
      if (stored && availableLocales.includes(stored)) {
        setLocale(stored)
        return
      }

      const browserLocale = navigator.language.startsWith('bn') ? 'bn' : 'en'
      setLocale(browserLocale)
    } catch (error) {
      setLocale(defaultLocale)
    }
  }, [])

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocale(next)
        window.localStorage.setItem('lawweb-lang', next)
      },
      t: (key: string) => translate(locale, key),
    }),
    [locale],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
