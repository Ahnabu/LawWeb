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
      <section className="px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.lawyersPage.title')}</p>
          <h1 className="mt-3 sm:mt-4 font-display font-semibold text-on-surface">{t('common.lawyersPage.title')}</h1>
          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-base">
            {t('common.lawyersPage.subtitle')}
          </p>
        </div>
        <div className="mx-auto mt-10 sm:mt-12 max-w-6xl card-elevated flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col w-full gap-3 sm:flex-row sm:items-center sm:flex-1">
            <input type="search" placeholder={t('common.searchByNameOrSpecialty')} className="w-full sm:w-96 text-sm" />
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {filters.map((filter) => (
                <button key={filter.labelKey} type="button" className="rounded-md border border-outline-variant bg-surface-container px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm text-on-surface-variant transition hover:border-secondary hover:text-secondary whitespace-nowrap">
                  {t(filter.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <Link href="/appointment" className="inline-flex items-center justify-center rounded-md bg-secondary px-4 sm:px-6 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90 w-full sm:w-auto">
            {t('common.lawyersPage.bookConsultation')}
          </Link>
        </div>

        <div className="mx-auto mt-10 sm:mt-12 max-w-6xl grid gap-4 sm:gap-6 lg:grid-cols-3">
          {lawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} {...lawyer} />
          ))}
        </div>

        <div className="mt-10 sm:mt-12 flex items-center justify-center">
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
