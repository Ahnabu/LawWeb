'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { ClientServicesSection, EYEBROW, SECTION, paragraphs, usePrincipalPortrait } from '../../components/AboutSections'
import { useLanguage } from '../../components/LanguageProvider'
import { useContentList, useSiteSettings } from '../../components/contentHooks'
import {
  aboutCertifications,
  cyberPractice,
  generations as defaultGenerations,
  mediaCoverage,
  missionValues,
  principalBooks,
  principalCareer,
  principalHighlights,
  principalStats,
  scholarLinks,
} from '../../lib/data'

// Newlines separate list rows in admin text
const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)

const linkHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

type Photo = { src: string; alt: string }

export default function AboutPage() {
  const { t, locale } = useLanguage()
  const { whatsappHref } = useSiteSettings()

  const stats = useContentList('about', 'principalStats', principalStats)
  const highlights = useContentList('about', 'principalHighlights', principalHighlights)
  const generations = useContentList('about', 'generations', defaultGenerations)
  const career = useContentList('about', 'principalCareer', principalCareer)
  const cyber = useContentList('about', 'cyberPractice', cyberPractice)
  const media = useContentList('about', 'media', mediaCoverage)
  const books = useContentList('about', 'books', principalBooks)
  const links = useContentList('about', 'scholarLinks', scholarLinks)
  const certifications = useContentList('about', 'certifications', aboutCertifications)
  const values = useContentList('about', 'values', missionValues)

  const portrait = usePrincipalPortrait()
  const principalName = t('about.principal.name')
  const number = (n: number) => n.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB')
  const [featuredBook, ...otherBooks] = books

  // Larger view of a generation photo, in a native modal dialog
  const viewerRef = useRef<HTMLDialogElement>(null)
  const [viewing, setViewing] = useState<Photo | null>(null)
  useEffect(() => {
    if (viewing && !viewerRef.current?.open) viewerRef.current?.showModal()
  }, [viewing])

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />

      {/* Principal of the firm */}
      <section className="page-hero px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <div className="relative mx-auto aspect-3/4 w-full max-w-sm overflow-hidden rounded-xl border border-secondary/40 shadow-2xl">
            <Image src={portrait} alt={principalName} fill priority sizes="(min-width: 768px) 24rem, 90vw" className="object-cover object-top" />
          </div>
          <div>
            <p className="text-sm font-semibold text-secondary">{t('about.heroLabel')}</p>
            <h1 className="mt-3 text-white">{principalName}</h1>
            <p className="mt-2 text-base font-medium text-white/80">{t('about.principal.qualifications')}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-secondary/40 bg-white/5 px-3 py-1.5 text-sm font-semibold text-secondary">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
              {t('about.principal.status')}
            </p>
            <p className="mt-6 font-display text-xl leading-snug text-white sm:text-2xl">{t('about.principal.headline')}</p>
            <p className="mt-3 max-w-xl text-base leading-7 text-white/80">{t('about.principal.specialty')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/appointment" className="btn btn-primary btn-lg">
                {t('about.principal.bookCta')}
              </Link>
              <Link href={whatsappHref(t('site.whatsappMessage'))} className="btn btn-on-dark btn-lg">
                {t('about.principal.whatsappCta')}
              </Link>
            </div>
            {stats.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.id} className="bg-(--hero-to) px-4 py-3">
                    <dt className="text-sm text-white/70">{stat.label}</dt>
                    <dd className="font-display text-2xl font-bold text-secondary">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* Biography + qualifications */}
      <section className={SECTION}>
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div className="space-y-5">
            {paragraphs(t('about.principal.bio')).map((paragraph, i) => (
              <p key={i} className="max-w-prose text-base leading-8 text-on-surface-variant first:text-lg first:text-on-surface">
                {paragraph}
              </p>
            ))}
          </div>
          {highlights.length > 0 && (
            <div className="card p-6 sm:p-7">
              <h2 className="text-xl text-heading">{t('about.highlights.title')}</h2>
              <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div key={item.id} className="border-t border-outline-variant pt-3">
                    <dt className="text-sm font-semibold text-gold-ink">{item.title}</dt>
                    <dd className="mt-1 text-base leading-7 text-on-surface">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>

      {/* Generations table */}
      {generations.length > 0 && (
        <section className={`border-y border-outline-variant bg-surface-container ${SECTION}`}>
          <div className="mx-auto max-w-6xl">
            <p className={EYEBROW}>{t('about.generations.label')}</p>
            <h2 className="mt-2 text-heading">{t('about.generations.title')}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-on-surface-variant">{t('about.generations.subtitle')}</p>

            <div className="card mt-8 overflow-hidden p-0">
              <table className="w-full border-collapse text-left">
                <thead className="hidden border-b border-outline bg-surface-container md:table-header-group">
                  <tr className="text-sm text-on-surface-variant">
                    <th scope="col" className="w-32 px-5 py-3 font-semibold">{t('about.generations.colGeneration')}</th>
                    <th scope="col" className="w-36 px-5 py-3 font-semibold">{t('about.generations.colPhoto')}</th>
                    <th scope="col" className="w-60 px-5 py-3 font-semibold">{t('about.generations.colName')}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{t('about.generations.colAchievements')}</th>
                  </tr>
                </thead>
                <tbody>
                  {generations.map((gen, index) => (
                    <tr
                      key={gen.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-outline-variant p-5 first:border-t-0 md:table-row md:p-0"
                    >
                      <td className="col-start-2 row-start-1 md:px-5 md:py-5 md:align-top">
                        <div className="flex items-center gap-3 md:flex-col md:items-start">
                          <span className="monogram h-12 w-12 flex-col text-lg leading-none">
                            <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-wide text-white/70">
                              {t('about.generations.genShort')}
                            </span>
                            {number(index + 1)}
                          </span>
                          <span className="text-sm font-medium text-on-surface-variant">{gen.era}</span>
                        </div>
                      </td>
                      <td className="col-start-1 row-span-2 row-start-1 md:px-5 md:py-5 md:align-top">
                        {gen.photo && (
                          <button
                            type="button"
                            onClick={() => setViewing({ src: gen.photo, alt: gen.name })}
                            aria-label={`${t('gallery.open')}: ${gen.name}`}
                            className="relative block h-30 w-24 overflow-hidden rounded-lg border border-outline-variant bg-surface-container shadow-sm transition-shadow hover:shadow-md"
                          >
                            <Image src={gen.photo} alt="" fill sizes="96px" className="object-cover object-top" />
                          </button>
                        )}
                      </td>
                      <td className="col-start-2 row-start-2 md:px-5 md:py-5 md:align-top">
                        <p className="text-sm font-semibold text-gold-ink">{gen.relation}</p>
                        <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-on-surface">{gen.name}</h3>
                        {gen.note && <p className="panel mt-3 px-3 py-2 text-sm leading-6 text-on-surface-variant">{gen.note}</p>}
                      </td>
                      <td className="col-span-2 md:px-5 md:py-5 md:align-top">
                        <ul className="space-y-1.5">
                          {lines(gen.achievements).map((line, i) => (
                            <li key={i} className="flex gap-2.5 text-base leading-7 text-on-surface">
                              <span aria-hidden="true" className="mt-2.75 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Books & scholar links */}
      {(featuredBook || links.length > 0) && (
        <section className={SECTION}>
          <div className="mx-auto max-w-6xl">
            <h2 className="text-heading">{t('about.books.title')}</h2>
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
              {featuredBook && (
                <div className="card overflow-hidden p-0">
                  {featuredBook.cover && (
                    <div className="relative aspect-16/10 bg-surface-container">
                      <Image src={featuredBook.cover} alt={featuredBook.title} fill sizes="(min-width: 1024px) 36rem, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="p-6 sm:p-7">
                    <p className={EYEBROW}>{t('about.books.featured')}</p>
                    <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-on-surface">{featuredBook.title}</h3>
                    {featuredBook.subtitle && <p className="mt-2 text-base leading-7 text-on-surface-variant">{featuredBook.subtitle}</p>}
                    <a href={featuredBook.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5">
                      {t('about.books.buy')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                    {otherBooks.length > 0 && (
                      <ul className="mt-6 divide-y divide-outline-variant border-t border-outline-variant">
                        {otherBooks.map((book) => (
                          <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <span>
                              <span className="block font-semibold text-on-surface">{book.title}</span>
                              {book.subtitle && <span className="block text-sm text-on-surface-variant">{book.subtitle}</span>}
                            </span>
                            <a href={book.url} target="_blank" rel="noopener noreferrer" className="text-link inline-flex items-center gap-1 text-sm">
                              {t('about.books.buy')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {links.length > 0 && (
                <div>
                  <h3 className="text-xl text-heading">{t('about.research.title')}</h3>
                  <ul className="mt-3 divide-y divide-outline-variant border-y border-outline-variant">
                    {links.map((link) => (
                      <li key={link.id}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-4 py-4">
                          <span>
                            <span className="block font-semibold text-on-surface group-hover:text-gold-ink">{link.label}</span>
                            {link.description && <span className="mt-1 block text-sm leading-6 text-on-surface-variant">{link.description}</span>}
                            <span className="mt-1 block text-sm text-gold-ink">{linkHost(link.url)}</span>
                          </span>
                          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-gold-ink" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <ClientServicesSection className="border-y border-outline-variant bg-surface-container" />

      {/* Cyber practice */}
      <section className={SECTION}>
        <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className={EYEBROW}>{t('about.cyber.label')}</p>
            <h2 className="mt-3 text-heading">{t('about.cyber.title')}</h2>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">{t('about.cyber.text')}</p>
          </div>
          {cyber.length > 0 && (
            <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {cyber.map((item) => (
                <div key={item.id} className="border-l-2 border-secondary pl-4">
                  <dt className="font-semibold text-on-surface">{item.title}</dt>
                  <dd className="mt-1 text-sm leading-6 text-on-surface-variant">{item.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Career & distinctions */}
      {career.length > 0 && (
        <section className={`border-y border-outline-variant bg-surface-container ${SECTION}`}>
          <div className="mx-auto max-w-6xl">
            <h2 className="text-heading">{t('about.career.title')}</h2>
            <dl className="card mt-6 divide-y divide-outline-variant p-0">
              {career.map((item) => (
                <div key={item.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
                  <dt className="font-display font-semibold text-on-surface">{item.title}</dt>
                  <dd className="text-base leading-7 text-on-surface-variant">{item.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Media coverage */}
      {media.length > 0 && (
        <section className={SECTION}>
          <div className="mx-auto max-w-6xl">
            <h2 className="text-heading">{t('about.media.title')}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-on-surface-variant">{t('about.media.text')}</p>
            <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
              {media.map((item) => {
                const body = (
                  <>
                    <span>
                      <span className="font-semibold text-on-surface">{item.outlet}</span>
                      <span className="text-on-surface-variant"> · {item.title}</span>
                      {item.url && <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 text-gold-ink" aria-hidden="true" />}
                    </span>
                    {item.date && <span className="shrink-0 text-sm text-on-surface-variant">{item.date}</span>}
                  </>
                )
                const row = 'flex items-baseline justify-between gap-4 border-b border-outline-variant py-3'
                return (
                  <li key={item.id}>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className={`${row} hover:text-gold-ink`}>
                        {body}
                      </a>
                    ) : (
                      <div className={row}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Firm overview + certifications */}
      <section className={`border-t border-outline-variant bg-surface-container ${SECTION}`}>
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

      {/* Mission & values */}
      <section className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-heading">{t('about.missionTitle')}</h2>
          <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-3">
            {values.map((value) => (
              <div key={value.id} className="border-t-2 border-secondary pt-4">
                <dt className="font-display text-lg font-semibold text-on-surface">{value.title}</dt>
                <dd className="mt-2 text-base leading-7 text-on-surface-variant">{value.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <dialog
        ref={viewerRef}
        onClose={() => setViewing(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) viewerRef.current?.close()
        }}
        aria-label={viewing?.alt}
        className="m-auto max-h-[92vh] max-w-[92vw] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
      >
        {viewing && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.src} alt={viewing.alt} className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => viewerRef.current?.close()}
              className="btn btn-secondary btn-icon absolute right-2 top-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{t('gallery.close')}</span>
            </button>
          </div>
        )}
      </dialog>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
