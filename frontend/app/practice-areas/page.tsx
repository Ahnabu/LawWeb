'use client'

import Link from 'next/link'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { PracticeAreaCard } from '../../components/PracticeAreaCard'
import { structuredTextExcerpt } from '../../components/StructuredText'
import { useLanguage } from '../../components/LanguageProvider'
import { useContentList } from '../../components/contentHooks'
import { practiceAreas } from '../../lib/data'

// How many practice area cards this page shows before "See more"
const PRACTICE_PAGE_CARD_LIMIT = 6

export default function PracticeAreasPage() {
  const { t, localePath } = useLanguage()
  const areas = useContentList('practice-areas', 'areas', practiceAreas)

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

      {/* Six teaser cards (two rows of three); the full write-ups are the
          accordions on /practice-areas/all, behind the single "See more" button */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {areas.slice(0, PRACTICE_PAGE_CARD_LIMIT).map((area) => (
              <PracticeAreaCard
                key={area.id}
                title={area.title}
                description={structuredTextExcerpt(area.details) || area.description}
              />
            ))}
          </div>
          <div className="mt-8 flex justify-center sm:mt-10">
            <Link href={localePath('/practice-areas/all')} className="btn btn-secondary">
              {t('common.practiceSeeMore')}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
