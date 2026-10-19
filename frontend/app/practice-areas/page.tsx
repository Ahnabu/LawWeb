'use client'

import { useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { PracticeAreaCard } from '../../components/PracticeAreaCard'
import { StructuredText } from '../../components/StructuredText'
import { useLanguage } from '../../components/LanguageProvider'
import { useContentList } from '../../components/contentHooks'
import { practiceAreas } from '../../lib/data'

export default function PracticeAreasPage() {
  const { t } = useLanguage()
  const areas = useContentList('practice-areas', 'areas', practiceAreas)

  // "Read more" links and /practice-areas#slug open that area's write-up
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (target instanceof HTMLDetailsElement) {
        target.open = true
        target.scrollIntoView({ block: 'start' })
      }
    }
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [areas])

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t('common.practicePageTitle')}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t('common.allPracticeAreasTitle')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            {t('common.practicePageSubtitle')}
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 sm:gap-5 md:grid-cols-2">
          {areas.slice(0, 4).map((area) => (
            <PracticeAreaCard key={area.id} title={area.title} description={area.description} href={`#${area.slug}`} />
          ))}
        </div>
      </section>

      <section className="border-t border-outline-variant bg-surface-container px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-heading">All Practice Areas</h2>
          <div className="card mt-8 divide-y divide-outline-variant">
            {areas.map((area) => (
              <details key={area.id} id={area.slug} className="group scroll-mt-24">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-container/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-on-surface">{area.title}</span>
                    {area.description && (
                      <span className="mt-0.5 block text-sm text-on-surface-variant">{area.description}</span>
                    )}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="border-t border-outline-variant px-5 py-5 sm:px-6 sm:py-6">
                  <StructuredText value={area.details} />
                </div>
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
