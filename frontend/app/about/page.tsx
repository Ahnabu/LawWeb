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
      <section className="bg-primary px-6 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            {t('about.heroLabel')}
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight">
            {t('about.heroTitle')}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            {t('about.heroSubtitle')}
          </p>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-elevated space-y-6 p-10">
            <h2 className="font-display text-3xl font-semibold text-on-surface">
              {t('about.overviewTitle')}
            </h2>
            <p className="text-base leading-7 text-on-surface-variant">
              {t('about.overviewText')}
            </p>
            <div className="rounded-xl bg-secondary/10 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                {t('about.promiseTitle')}
              </p>
              <p className="mt-4 text-lg font-semibold leading-7 text-on-surface">
                {t('about.promiseText')}
              </p>
            </div>
          </div>
          <div className="card-elevated p-10">
            <h3 className="font-display text-2xl font-semibold text-on-surface">
              {t('about.certificationsTitle')}
            </h3>
            <ul className="mt-6 space-y-3 text-on-surface-variant">
              {certifications.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-surface-container px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold text-on-surface">
            {t('about.timelineTitle')}
          </h2>
          <div className="mt-12 space-y-8">
            {timeline.map((item) => (
              <div
                key={item.id}
                className="card-elevated grid gap-4 p-8 md:grid-cols-[150px_1fr]"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  {item.year}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-on-surface">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-on-surface-variant">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-elevated p-10">
            <h2 className="font-display text-3xl font-semibold text-on-surface">
              {t('about.principalTitle')}
            </h2>
            <p className="mt-4 text-lg font-semibold text-on-surface">
              {t('about.principalName')}
            </p>
            <p className="mt-3 leading-7 text-on-surface-variant">
              {t('about.principalText')}
            </p>
            <div className="mt-8 space-y-4">
              {credentials.map((credential) => (
                <p
                  key={credential.id}
                  className="rounded-xl bg-surface-container p-4 text-on-surface-variant"
                >
                  {credential.label}
                </p>
              ))}
            </div>
          </div>
          <div className="card-elevated p-10">
            <h2 className="font-display text-3xl font-semibold text-on-surface">
              {t('about.missionTitle')}
            </h2>
            <div className="mt-8 space-y-6">
              {values.map((value) => (
                <div
                  key={value.id}
                  className="rounded-xl bg-surface-container p-6"
                >
                  <h3 className="text-xl font-semibold text-on-surface">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-on-surface-variant">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
