'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import { useContent } from './ContentProvider'
import { useLanguage } from './LanguageProvider'
import { useContentList } from './contentHooks'
import {
  diasporaServices,
  foreignClientFacts,
  generations as defaultGenerations,
  principalBooks,
  principalStats,
} from '../lib/data'

// ── About page sections that also appear on the home page ─────────────────────
// Content comes from the About page in the CMS, so one edit updates both pages.

// Section padding and the small uppercase label above section headings
export const SECTION = 'px-4 py-12 sm:px-6 sm:py-16 lg:px-8'
export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.16em] text-gold-ink'

const DEFAULT_PORTRAIT = '/about/principal.webp'

// Blank lines separate paragraphs in admin text
export const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

// Uploaded portrait of the principal, or the bundled default
export function usePrincipalPortrait() {
  const { content } = useContent()
  const uploaded = content.about?.principalPhoto
  return typeof uploaded === 'string' && uploaded ? uploaded : DEFAULT_PORTRAIT
}

// Light markup the admin can use in some intro texts: **bold** and [tag]
export function InlineText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.length > 2 && part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={i} className="rounded bg-(--hero-to) px-1.5 py-0.5 text-sm font-medium text-white">
          {part.slice(1, -1)}
        </span>
      )
    }
    return part
  })
}

// Home page: short introduction of the principal, linking to the full profile
export function PrincipalIntro({ className = '' }: { className?: string }) {
  const { t, localePath } = useLanguage()
  const portrait = usePrincipalPortrait()
  const stats = useContentList('about', 'principalStats', principalStats)
  const [book] = useContentList('about', 'books', principalBooks)
  const name = t('about.principal.name')
  const [firstParagraph] = paragraphs(t('about.principal.bio'))

  return (
    <section className={`${SECTION} ${className}`}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-14">
        <div className="relative mx-auto aspect-4/5 w-full max-w-xs overflow-hidden rounded-xl border border-outline-variant shadow-lg">
          <Image src={portrait} alt={name} fill sizes="(min-width: 768px) 20rem, 80vw" className="object-cover object-top" />
        </div>
        <div>
          <p className={EYEBROW}>{t('about.heroLabel')}</p>
          <h2 className="mt-3 text-heading">{name}</h2>
          <p className="mt-1 text-base font-medium text-on-surface-variant">{t('about.principal.qualifications')}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-secondary/50 px-3 py-1 text-sm font-semibold text-gold-ink">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
            {t('about.principal.status')}
          </p>
          <p className="mt-5 font-display text-xl leading-snug text-on-surface">{t('about.principal.headline')}</p>
          {firstParagraph && <p className="mt-3 max-w-prose text-base leading-7 text-on-surface-variant">{firstParagraph}</p>}

          {stats.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {stats.map((stat) => (
                <div key={stat.id} className="flex flex-col-reverse">
                  <dt className="text-sm text-on-surface-variant">{stat.label}</dt>
                  <dd className="font-display text-2xl font-bold text-gold-ink">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href={localePath('/about')} className="btn btn-primary shrink-0">
              {t('home.principalLink')}
            </Link>
            {book && (
              <a href={book.url} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-raised p-2 pr-4">
                {book.cover && (
                  <span className="relative block h-12 w-18 shrink-0 overflow-hidden rounded">
                    <Image src={book.cover} alt="" fill sizes="72px" className="object-cover" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-gold-ink">{t('about.books.featured')}</span>
                  <span className="block truncate text-sm font-semibold text-on-surface group-hover:text-gold-ink">{book.title}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-gold-ink" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// Home page: the four generations as portrait cards (the About page has the full table)
export function GenerationsStrip({ className = '' }: { className?: string }) {
  const { t, locale, localePath } = useLanguage()
  const generations = useContentList('about', 'generations', defaultGenerations)
  if (generations.length === 0) return null

  return (
    <section className={`${SECTION} ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className={EYEBROW}>{t('about.generations.label')}</p>
            <h2 className="mt-2 text-heading">{t('about.generations.title')}</h2>
            <p className="mt-3 text-base leading-7 text-on-surface-variant">{t('about.generations.subtitle')}</p>
          </div>
          <Link href={localePath('/about')} className="btn btn-secondary shrink-0 self-start sm:self-auto">
            {t('home.generationsLink')}
          </Link>
        </div>
        <ol className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {generations.map((gen, index) => (
            <li key={gen.id}>
              <div className="relative aspect-4/5 overflow-hidden rounded-lg border border-outline-variant bg-surface-container shadow-sm">
                {gen.photo && <Image src={gen.photo} alt={gen.name} fill sizes="(min-width: 1024px) 18rem, 45vw" className="object-cover object-top" />}
                <span className="absolute left-2 top-2 rounded-md bg-(--hero-to) px-2 py-1 text-xs font-semibold text-secondary">
                  {t('about.generations.genShort')} {(index + 1).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB')}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-gold-ink">{gen.relation}</p>
              <h3 className="mt-0.5 font-display text-base font-semibold leading-snug text-on-surface sm:text-lg">{gen.name}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{gen.era}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// About + home pages: "Investment Gateway | Matrimonial Law" in two columns
export function ClientServicesSection({ className = '' }: { className?: string }) {
  const { t } = useLanguage()
  const foreignFacts = useContentList('about', 'foreignClients', foreignClientFacts)
  const diaspora = useContentList('about', 'diaspora', diasporaServices)

  return (
    <section className={`${SECTION} ${className}`}>
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-outline-variant">
        <div className="lg:pr-10">
          <p className={EYEBROW}>{t('about.foreign.label')}</p>
          <h2 className="mt-3 text-heading">{t('about.foreign.title')}</h2>
          <p className="mt-4 text-base leading-8 text-on-surface-variant">
            <InlineText text={t('about.foreign.text')} />
          </p>
          {foreignFacts.length > 0 && (
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              {foreignFacts.map((fact) => (
                <div key={fact.id} className="rounded-lg border border-outline-variant bg-surface-raised px-3 py-4 text-center">
                  <dt className="text-sm font-semibold text-on-surface">{fact.title}</dt>
                  <dd className="mt-1 text-sm text-on-surface-variant">{fact.text}</dd>
                </div>
              ))}
            </dl>
          )}
          {/* Fee & timeline note hidden at client's request (Oct 2026).
          <div className="mt-3 flex gap-3 rounded-lg bg-(--hero-to) px-5 py-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <p className="text-sm leading-6 text-white/90">
              <span className="font-semibold text-secondary">{t('about.foreign.noteTitle')}</span> {t('about.foreign.noteText')}
            </p>
          </div>
          */}
        </div>

        <div className="lg:pl-10">
          <p className={EYEBROW}>{t('about.diaspora.label')}</p>
          <h2 className="mt-3 text-heading">{t('about.diaspora.title')}</h2>
          <p className="mt-4 text-base leading-8 text-on-surface-variant">
            <InlineText text={t('about.diaspora.text')} />
          </p>
          {diaspora.length > 0 && (
            <ul className="mt-5 space-y-2">
              {diaspora.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-lg border border-outline-variant bg-surface-raised px-4 py-3 text-sm leading-6 text-on-surface">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm italic leading-6 text-on-surface-variant">{t('about.diaspora.note')}</p>
        </div>
      </div>
    </section>
  )
}
