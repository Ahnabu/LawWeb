'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { LawyerPublicCard } from '../../components/LawyerPublicCard'
import { useLanguage } from '../../components/LanguageProvider'
import { API_BASE_URL } from '../../lib/api'

interface PublicLawyer {
  _id: string
  name: string
  barId?: string
  specialization?: string
}

export default function LawyersPage() {
  const { t } = useLanguage()
  const [lawyers, setLawyers] = useState<PublicLawyer[]>([])
  const [filtered, setFiltered] = useState<PublicLawyer[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/lawyers/public`)
      .then((r) => r.json())
      .then((d) => {
        const list: PublicLawyer[] = d.lawyers ?? []
        setLawyers(list)
        setFiltered(list)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      lawyers.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.specialization ?? '').toLowerCase().includes(q) ||
          (l.barId ?? '').toLowerCase().includes(q),
      ),
    )
  }, [search, lawyers])

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            {t('common.lawyersPage.title')}
          </p>
          <h1 className="mt-3 sm:mt-4 font-display font-semibold text-on-surface">
            {t('common.lawyersPage.title')}
          </h1>
          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-base">
            {t('common.lawyersPage.subtitle')}
          </p>
        </div>

        {/* Search & CTA */}
        <div className="mx-auto mt-10 sm:mt-12 max-w-6xl card-elevated flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchByNameOrSpecialty')}
            className="w-full sm:w-96 text-sm rounded-lg border border-outline bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
          />
          <Link
            href="/dashboard/client/appointment"
            className="inline-flex items-center justify-center rounded-md bg-secondary px-4 sm:px-6 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90 w-full sm:w-auto"
          >
            {t('common.lawyersPage.bookConsultation')}
          </Link>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-10 sm:mt-12 max-w-6xl grid gap-4 sm:gap-6 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-outline-variant bg-surface-container"
              />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
              {search ? `No lawyers found matching "${search}".` : 'No lawyers available yet.'}
            </div>
          ) : (
            filtered.map((lawyer) => (
              <LawyerPublicCard key={lawyer._id} {...lawyer} />
            ))
          )}
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
