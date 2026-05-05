'use client'

import Link from 'next/link'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { WhatsAppCta } from '../components/WhatsAppCta'
import { LawyerCard } from '../components/LawyerCard'
import { SuccessStoryCard } from '../components/SuccessStoryCard'
import { PracticeAreaCard } from '../components/PracticeAreaCard'
import { useLanguage } from '../components/LanguageProvider'
import { practiceAreas, lawyers, successStories } from '../lib/data'

export default function HomePage() {
  const { t } = useLanguage()

  const stats = [
    { labelKey: 'common.statLabel1', valueKey: 'common.stat1' },
    { labelKey: 'common.statLabel2', valueKey: 'common.stat2' },
    { labelKey: 'common.statLabel3', valueKey: 'common.stat3' },
    { labelKey: 'common.statLabel4', valueKey: 'common.stat4' },
  ]

  return (
    <main className="relative overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="bg-hero-pattern pb-16 pt-8 sm:pb-20 sm:pt-10 md:pb-24 md:pt-12 lg:pb-28 lg:pt-14 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center lg:px-8">
          <span className="inline-flex rounded-md border border-secondary/40 bg-secondary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            {t('common.established')}
          </span>
          <h1 className="mt-6 sm:mt-8 font-display font-bold leading-tight tracking-tight text-white">
            {t('common.heroTitle')}
          </h1>
          <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg leading-7 sm:leading-8 text-slate-200">
            {t('common.heroSubtitle')}
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row">
            <Link href="/dashboard/client/appointment" className="inline-flex rounded-md bg-secondary px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-primary shadow-lg shadow-secondary/30 transition hover:bg-secondary/90 w-full sm:w-auto justify-center">
              {t('common.bookAppointment')}
            </Link>
            <Link href="https://wa.me/8801715365380" className="inline-flex items-center justify-center rounded-md border border-whatsapp/50 bg-white/10 px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-white transition hover:border-whatsapp hover:bg-white/15 w-full sm:w-auto">
              {t('common.whatsapp')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary px-4 sm:px-6 py-8 sm:py-10 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.valueKey} className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{t(stat.labelKey)}</p>
              <p className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-white">{t(stat.valueKey)}</p>
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
            {practiceAreas.map((area) => (
              <PracticeAreaCard
                key={area.titleKey}
                title={t(area.titleKey)}
                description={t(area.descriptionKey)}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/practice-areas" className="text-sm font-semibold text-secondary transition hover:text-secondary/80">
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
            {lawyers.map((lawyer) => (
              <LawyerCard key={lawyer.id} {...lawyer} />
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
            {successStories.map((story) => (
              <SuccessStoryCard
                key={story.titleKey}
                title={t(story.titleKey)}
                summary={t(story.summaryKey)}
                initials={story.initials}
                quote={t(story.quoteKey)}
                badge={t(story.badgeKey)}
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
            <Link href="/dashboard/client/appointment" className="rounded-md bg-secondary px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-primary transition hover:bg-secondary/90 text-center">
              {t('common.ctaBookAppointment')}
            </Link>
            <Link href="https://wa.me/8801715365380" className="rounded-md border border-white/30 bg-white/10 px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-white transition hover:bg-white/20 text-center">
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
