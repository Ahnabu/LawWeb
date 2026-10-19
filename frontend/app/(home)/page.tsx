'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { LawyerPublicCard } from '../../components/LawyerPublicCard'
import { SuccessStoryCard } from '../../components/SuccessStoryCard'
import { PracticeAreaCard } from '../../components/PracticeAreaCard'
import { useContent } from '../../components/ContentProvider'
import { useLanguage } from '../../components/LanguageProvider'
import { useContentList, useSiteSettings } from '../../components/contentHooks'
import { homeStats, practiceAreas, successStories } from '../../lib/data'
import { API_BASE_URL } from '../../lib/api'

interface PublicLawyer {
  _id: string
  name: string
  barId?: string
  specialization?: string
}

export default function HomePage() {
  const { t, localePath } = useLanguage()
  const [lawyers, setLawyers] = useState<PublicLawyer[]>([])
  const { whatsappHref } = useSiteSettings()
  const stats = useContentList('home', 'stats', homeStats)
  const stories = useContentList('home', 'successStories', successStories)
  const areas = useContentList('practice-areas', 'areas', practiceAreas)
  const { content } = useContent()
  const heroImage = typeof content.home?.heroImage === 'string' && /^https:\/\/[^\s"'()\\]+$/i.test(content.home.heroImage)
    ? content.home.heroImage
    : null

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/lawyers/public`)
      .then((r) => r.json())
      .then((d) => setLawyers((d.lawyers ?? []).slice(0, 3)))
      .catch(() => {})
  }, [])

  const heroContent = (
    <>
      <p className="hero-rise text-sm font-medium text-white/80">{t('common.established')}</p>
      <h1 className="hero-rise mx-auto mt-4 max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white [animation-delay:80ms]">
        {t('common.heroTitle')}
      </h1>
      <p className="hero-rise mx-auto mt-4 max-w-2xl text-base leading-7 text-white/85 [animation-delay:160ms] sm:text-lg">
        {t('common.heroSubtitle')}
      </p>
      <div className="hero-rise mt-8 flex flex-col items-stretch justify-center gap-3 [animation-delay:240ms] sm:flex-row sm:items-center">
        <Link href="/appointment" className="btn btn-primary btn-lg">
          {t('common.bookAppointment')}
        </Link>
        <Link href={whatsappHref()} className="btn btn-on-dark btn-lg">
          {t('common.whatsapp')}
        </Link>
      </div>
    </>
  )

  return (
    <main className="relative overflow-hidden">
      <Navbar />

      {/* Hero. With an uploaded photo it fills the screen below the navbar,
          minus a strip so the top of the stats bar peeks in and hints there's
          more below; min/max keep it sensible on very short or tall screens. */}
      {heroImage ? (
        <section className="hero-with-photo relative flex h-[calc(100svh-3.5rem-4.5rem)] min-h-[440px] max-h-[820px] items-center overflow-hidden bg-neutral-900 py-10 text-white sm:h-[calc(100svh-4.25rem-5rem)]">
          <div aria-hidden className="hero-photo absolute inset-0" style={{ backgroundImage: `url("${heroImage}")` }} />
          <div aria-hidden className="hero-overlay absolute inset-0" />
          <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">{heroContent}</div>
        </section>
      ) : (
        <section className="page-hero px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">{heroContent}</div>
        </section>
      )}

      {/* Stats: one engraved strip instead of a wall of cards */}
      <section className="bg-surface px-4 pt-10 sm:px-6 lg:px-8">
        <dl className="card mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className={`px-4 py-5 sm:px-6 ${index % 2 === 1 ? 'border-l border-outline-variant' : ''} ${
                index >= 2 ? 'border-t border-outline-variant lg:border-t-0' : ''
              } ${index === 2 ? 'lg:border-l' : ''}`}
            >
              <dt className="text-sm text-on-surface-variant">{stat.label}</dt>
              <dd className="mt-1 font-display text-base font-semibold leading-snug text-heading sm:text-lg">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Practice Areas */}
      <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="kicker">{t('common.practiceSectionLabel')}</p>
              <h2 className="mt-2 text-heading">{t('common.practiceHeading')}</h2>
              <p className="mt-3 text-base leading-7 text-on-surface-variant">{t('common.practiceDetail')}</p>
            </div>
            <Link href={localePath('/practice-areas')} className="text-link shrink-0 text-sm">
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {areas.map((area) => (
              <PracticeAreaCard key={area.id} title={area.title} description={area.description} />
            ))}
          </div>
        </div>
      </section>

      {/* Lawyers */}
      <section className="border-y border-outline-variant bg-surface-container px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="kicker">{t('common.teamSectionLabel')}</p>
              <h2 className="mt-2 text-heading">{t('common.teamHeading')}</h2>
            </div>
            <Link href="/lawyers" className="btn btn-secondary shrink-0 self-start sm:self-auto">
              {t('common.viewAllLawyers')}
            </Link>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {lawyers.length === 0
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-44 animate-pulse" />)
              : lawyers.map((lawyer) => <LawyerPublicCard key={lawyer._id} {...lawyer} />)}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <p className="kicker">{t('common.victoriesSectionLabel')}</p>
            <h2 className="mt-2 text-heading">{t('common.victoriesHeading')}</h2>
          </div>
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {stories.map((story) => (
              <SuccessStoryCard
                key={story.id}
                title={story.title}
                summary={story.summary}
                initials={story.initials}
                quote={story.quote}
                badge={story.badge}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us + closing call to action, in one navy band */}
      <section className="page-hero px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-secondary">{t('common.whyChooseSectionLabel')}</p>
            <h2 className="mt-2 text-white">{t('common.whyChoose')}</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              { title: t('common.feature1Title'), detail: t('common.feature1Detail') },
              { title: t('common.feature2Title'), detail: t('common.feature2Detail') },
              { title: t('common.feature3Title'), detail: t('common.feature3Detail') },
            ].map((item) => (
              <div key={item.title} className="border-t border-white/15 pt-5">
                <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-6 rounded-xl border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary">{t('common.ctaSectionLabel')}</p>
              <h2 className="mt-1 text-2xl text-white sm:text-[1.75rem]">{t('common.ctaTitle')}</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/appointment" className="btn btn-primary btn-lg">
                {t('common.ctaBookAppointment')}
              </Link>
              <Link href={whatsappHref()} className="btn btn-on-dark btn-lg">
                {t('common.ctaChatWhatsApp')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
