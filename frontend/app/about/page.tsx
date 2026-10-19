'use client'

import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { useLanguage } from '../../components/LanguageProvider'
import { useContentList } from '../../components/contentHooks'
import { aboutCertifications, missionValues, principalCredentials, timelineItems } from '../../lib/data'

export default function AboutPage() {
  const { t } = useLanguage()
  const certifications = useContentList('about', 'certifications', aboutCertifications)
  const timeline = useContentList('about', 'timeline', timelineItems)
  const credentials = useContentList('about', 'credentials', principalCredentials)
  const values = useContentList('about', 'values', missionValues)

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t('about.heroLabel')}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t('about.heroTitle')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            {t('about.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* Overview + certifications */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div>
            <h2 className="text-heading">{t('about.overviewTitle')}</h2>
            <p className="mt-4 max-w-prose text-base leading-7 text-on-surface-variant">{t('about.overviewText')}</p>
            <figure className="mt-8 max-w-prose border-l-2 border-secondary pl-5">
              <figcaption className="kicker">{t('about.promiseTitle')}</figcaption>
              <blockquote className="mt-2 font-display text-lg leading-8 text-on-surface">
                {t('about.promiseText')}
              </blockquote>
            </figure>
          </div>
          <div className="card p-6 sm:p-7">
            <h3 className="text-heading">{t('about.certificationsTitle')}</h3>
            <ul className="mt-4 divide-y divide-outline-variant text-sm leading-6 text-on-surface-variant">
              {certifications.map((item) => (
                <li key={item.id} className="py-3">
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-y border-outline-variant bg-surface-container px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-heading">{t('about.timelineTitle')}</h2>
          <ol className="mt-10 max-w-3xl border-l border-outline">
            {timeline.map((item) => (
              <li key={item.id} className="relative pb-10 pl-6 last:pb-0 sm:pl-8">
                <span
                  aria-hidden="true"
                  className="absolute -left-1.25 top-1.5 h-2.5 w-2.5 rounded-full border border-[#a8873a] bg-secondary"
                />
                <p className="text-sm font-semibold text-gold-ink">{item.year}</p>
                <h3 className="mt-1 text-heading">{item.title}</h3>
                <p className="mt-2 max-w-prose text-base leading-7 text-on-surface-variant">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Principal + mission */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl text-heading">{t('about.principalTitle')}</h2>
            <p className="mt-3 text-lg font-semibold text-on-surface">{t('about.principalName')}</p>
            <p className="mt-2 text-base leading-7 text-on-surface-variant">{t('about.principalText')}</p>
            <ul className="panel mt-6 divide-y divide-outline-variant text-sm leading-6 text-on-surface-variant">
              {credentials.map((credential) => (
                <li key={credential.id} className="px-4 py-3">
                  {credential.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl text-heading">{t('about.missionTitle')}</h2>
            <dl className="mt-4 divide-y divide-outline-variant">
              {values.map((value) => (
                <div key={value.id} className="py-4 last:pb-0">
                  <dt className="font-display text-lg font-semibold text-on-surface">{value.title}</dt>
                  <dd className="mt-1 text-base leading-7 text-on-surface-variant">{value.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
