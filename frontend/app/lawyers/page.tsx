'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
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
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-white">{t('common.lawyersPage.title')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            {t('common.lawyersPage.subtitle')}
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Search & CTA */}
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-sm">
            <span className="sr-only">{t('common.searchByNameOrSpecialty')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.searchByNameOrSpecialty')}
              className="field pl-9"
            />
          </label>
          <Link href="/appointment" className="btn btn-primary w-full sm:w-auto">
            {t('common.lawyersPage.bookConsultation')}
          </Link>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-44 animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="panel col-span-full p-8 text-center text-sm text-on-surface-variant">
              {search ? `No lawyers found matching "${search}".` : 'No lawyers available yet.'}
            </div>
          ) : (
            filtered.map((lawyer) => <LawyerPublicCard key={lawyer._id} {...lawyer} />)
          )}
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
