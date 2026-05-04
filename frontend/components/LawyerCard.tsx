import Link from 'next/link'
import { Star } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

interface LawyerCardProps {
  id: string
  name: string
  roleKey: string
  barId: string
  specialties: string[]
  bioKey: string
  rating: number
  variant?: 'grid' | 'horizontal'
}

export function LawyerCard({ id, name, roleKey, barId, specialties, bioKey, rating, variant = 'grid' }: LawyerCardProps) {
  const { t } = useLanguage()
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  const nameParts = name.split(' ')
  const firstLine = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : name
  const secondLine = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

  return (
    <div
      className={`group card-elevated h-full overflow-hidden border border-outline-variant bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        variant === 'horizontal' ? 'flex flex-col md:flex-row' : 'flex flex-col'
      }`}
    >
      <div className="h-1 bg-linear-to-r from-secondary via-secondary/70 to-primary/30" />

      <div className={`flex h-full flex-1 flex-col gap-5 p-5 sm:p-6 ${variant === 'horizontal' ? 'md:flex-row md:items-start md:gap-6' : ''}`}>
        <div className={`flex items-start gap-4 ${variant === 'horizontal' ? 'md:w-40 md:flex-col md:items-center md:text-center' : ''}`}>
          <div className="placeholder-photo flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-semibold text-on-surface-variant ring-1 ring-outline-variant sm:h-24 sm:w-24 sm:text-3xl">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-secondary sm:text-xs">{t(roleKey)}</p>
            <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-on-surface sm:text-[1.75rem]">
              <span className="block">{firstLine}</span>
              {secondLine ? <span className="block">{secondLine}</span> : null}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-on-surface-variant">
              {t('common.barCouncilId')}: {barId}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm leading-6 text-on-surface-variant sm:text-[0.95rem] sm:leading-7">
            {t(bioKey)}
          </p>

          <div className="flex flex-wrap gap-2">
            {specialties.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1.5 text-[0.7rem] font-semibold text-secondary sm:text-xs"
              >
                {t(tag)}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface shadow-sm">
              <Star className="h-4 w-4 text-secondary" />
              <span>{rating.toFixed(1)}</span>
            </div>

            <Link
              href={`/lawyers/${id}`}
              className="inline-flex items-center justify-center rounded-full border border-secondary bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary hover:text-primary"
            >
              {t('common.viewProfile')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
