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
            <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6 lg:px-8">
              <span className="hero-rise inline-flex rounded-md border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary backdrop-blur-sm sm:px-4 sm:py-2 sm:text-xs">
                {t('common.established')}
              </span>
              <h1 className="hero-rise mx-auto mt-4 max-w-4xl font-display font-bold leading-tight tracking-tight text-white [animation-delay:120ms] sm:mt-6">
                {t('common.heroTitle')}
              </h1>
              <p className="hero-rise mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-100 [animation-delay:240ms] sm:mt-5 sm:text-base sm:leading-7 lg:text-lg">
                {t('common.heroSubtitle')}
              </p>
              <div className="hero-rise mt-6 flex flex-col items-center justify-center gap-3 [animation-delay:360ms] sm:mt-8 sm:flex-row sm:gap-4">
                <Link href="/appointment" className="inline-flex w-full justify-center rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5 hover:bg-secondary/90 sm:w-auto sm:px-8 sm:py-3.5">
                  {t('common.bookAppointment')}
                </Link>
                <Link href={whatsappHref()} className="inline-flex w-full items-center justify-center rounded-md border border-whatsapp/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-whatsapp hover:bg-white/15 sm:w-auto sm:px-8 sm:py-3.5">
                  {t('common.whatsapp')}
                </Link>
              </div>
            </div>
          </section>
      ) : (
        <section className="bg-hero-pattern pb-16 pt-8 text-white sm:pb-20 sm:pt-10 md:pb-24 md:pt-12 lg:pb-28 lg:pt-14">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <span className="hero-rise inline-flex rounded-md border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-secondary sm:px-4 sm:py-2">
              {t('common.established')}
            </span>
            <h1 className="hero-rise mt-6 font-display font-bold leading-tight tracking-tight text-white [animation-delay:120ms] sm:mt-8">
              {t('common.heroTitle')}
            </h1>
            <p className="hero-rise mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-200 [animation-delay:240ms] sm:mt-6 sm:text-lg sm:leading-8">
              {t('common.heroSubtitle')}
            </p>
            <div className="hero-rise mt-8 flex flex-col items-center justify-center gap-3 [animation-delay:360ms] sm:mt-10 sm:flex-row sm:gap-4">
              <Link href="/appointment" className="inline-flex w-full justify-center rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5 hover:bg-secondary/90 sm:w-auto sm:px-8 sm:py-4">
                {t('common.bookAppointment')}
              </Link>
              <Link href={whatsappHref()} className="inline-flex w-full items-center justify-center rounded-md border border-whatsapp/50 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-whatsapp hover:bg-white/15 sm:w-auto sm:px-8 sm:py-4">
                {t('common.whatsapp')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      {/* Stats: light section with frosted-glass cards. A soft blurred blob
          sits behind the cards so the glass effect is visible. */}
      <section className="relative overflow-hidden bg-surface px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 top-1/2 h-48 w-72 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="stat-glass rounded-lg p-4 text-center transition hover:-translate-y-0.5 sm:rounded-xl sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{stat.label}</p>
              <p className="mt-3 text-lg font-semibold text-on-surface sm:mt-4 sm:text-xl">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Practice Areas */}
      <section className="bg-surface px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.practiceSectionLabel')}</p>
            <h2 className="mt-3 sm:mt-4 font-display font-semibold text-on-surface">{t('common.practiceHeading')}</h2>
            <p className="mt-2 sm:mt-3 text-sm leading-6 text-on-surface-variant sm:text-base">
              {t('common.practiceDetail')}
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
            {areas.map((area) => (
              <PracticeAreaCard
                key={area.id}
                title={area.title}
                description={area.description}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href={localePath("/practice-areas")} className="text-sm font-semibold text-secondary transition hover:text-secondary/80">
              {t('common.viewAll')}
            </Link>
          </div>
        </div>
      </section>

      {/* Lawyers */}
      <section className="bg-surface-container px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.teamSectionLabel')}</p>
            <h2 className="mt-3 sm:mt-4 font-display font-semibold text-on-surface">{t('common.teamHeading')}</h2>
          </div>
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {lawyers.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl border border-outline-variant bg-surface-container" />
                ))
              : lawyers.map((lawyer) => (
                  <LawyerPublicCard key={lawyer._id} {...lawyer} />
                ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/lawyers" className="inline-flex rounded-md border border-secondary bg-surface px-6 py-3 text-sm font-semibold text-secondary transition hover:bg-secondary/10">
              {t('common.viewAllLawyers')}
            </Link>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="bg-surface px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.victoriesSectionLabel')}</p>
            <h2 className="mt-3 sm:mt-4 font-display font-semibold text-on-surface">{t('common.victoriesHeading')}</h2>
          </div>
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
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

      {/* Why Choose Us */}
      <section className="bg-primary px-4 sm:px-6 py-12 sm:py-16 text-white lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.whyChooseSectionLabel')}</p>
          <h2 className="mt-3 sm:mt-4 font-display font-semibold">{t('common.whyChoose')}</h2>
          <div className="mt-10 sm:mt-12 grid gap-4 sm:gap-6 md:grid-cols-3">
            {[
              { title: t('common.feature1Title'), detail: t('common.feature1Detail') },
              { title: t('common.feature2Title'), detail: t('common.feature2Detail') },
              { title: t('common.feature3Title'), detail: t('common.feature3Detail') },
            ].map((item) => (
              <div key={item.title} className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8 text-left">
                <p className="text-lg sm:text-2xl font-semibold text-white">{item.title}</p>
                <p className="mt-3 sm:mt-4 text-sm leading-6 text-on-primary">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 sm:px-6 py-12 sm:py-16 text-white lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 lg:flex-row">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t('common.ctaSectionLabel')}</p>
            <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl font-semibold">{t('common.ctaTitle')}</h2>
          </div>
          <div className="flex w-full lg:w-auto flex-col gap-3 sm:flex-row">
            <Link href="/appointment" className="rounded-md bg-secondary px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-primary transition hover:bg-secondary/90 text-center">
              {t('common.ctaBookAppointment')}
            </Link>
            <Link href={whatsappHref()} className="rounded-md border border-white/30 bg-white/10 px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-white transition hover:bg-white/20 text-center">
              {t('common.ctaChatWhatsApp')}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
