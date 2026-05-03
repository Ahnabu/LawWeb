'use client'

import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { PracticeAreaCard } from '../../components/PracticeAreaCard'
import { useLanguage } from '../../components/LanguageProvider'
import { practiceAreaDetails } from '../../lib/data'

export default function PracticeAreasPage() {
  const { t } = useLanguage()
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="bg-surface px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.practicePageTitle')}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">{t('common.allPracticeAreasTitle')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
            {t('common.practicePageSubtitle')}
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-6xl grid gap-6 xl:grid-cols-2">
          {practiceAreaDetails.slice(0, 4).map((area) => (
            <PracticeAreaCard key={area.titleKey} title={t(area.titleKey)} description={t(area.detailsKey)} />
          ))}
        </div>
      </section>
      <section className="bg-surface-container px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold text-on-surface">All Practice Areas</h2>
          <div className="mt-10 space-y-4">
            {practiceAreaDetails.map((area) => (
              <details key={area.titleKey} className="card-elevated p-6">
                <summary className="cursor-pointer text-lg font-semibold text-on-surface">{t(area.titleKey)}</summary>
                <p className="mt-4 text-on-surface-variant">{t(area.detailsKey)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
