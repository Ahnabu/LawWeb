'use client'

import Link from 'next/link'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { LawyerCard } from '../../components/LawyerCard'
import { useLanguage } from '../../components/LanguageProvider'
import { lawyers } from '../../lib/data'

const filters = [
  { labelKey: 'common.filters.all' },
  { labelKey: 'common.filters.immigration' },
  { labelKey: 'common.filters.corporate' },
  { labelKey: 'common.filters.civil' },
  { labelKey: 'common.filters.criminal' },
  { labelKey: 'common.filters.family' },
]

export default function LawyersPage() {
  const { t } = useLanguage()
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.lawyersPage.title')}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">{t('common.lawyersPage.title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
            {t('common.lawyersPage.subtitle')}
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-6xl card-elevated flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <input type="search" placeholder={t('common.searchByNameOrSpecialty')} className="w-full sm:w-96" />
            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <button key={filter.labelKey} type="button" className="rounded-md border border-outline-variant bg-surface-container px-4 py-2 text-sm text-on-surface-variant transition hover:border-secondary hover:text-secondary">
                  {t(filter.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <Link href="/appointment" className="inline-flex items-center justify-center rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90">
            {t('common.lawyersPage.bookConsultation')}
          </Link>
        </div>

        <div className="mx-auto mt-12 max-w-6xl grid gap-6 lg:grid-cols-3">
          {lawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} {...lawyer} />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center">
          <button type="button" className="rounded-md border border-secondary bg-surface px-6 py-3 text-sm font-semibold text-secondary transition hover:bg-secondary/10">
            Load More Lawyers
          </button>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
