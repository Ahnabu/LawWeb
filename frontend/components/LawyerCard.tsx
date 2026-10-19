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

  return (
    <div
      className={`card card-interactive h-full p-5 sm:p-6 ${
        variant === 'horizontal' ? 'flex flex-col gap-5 md:flex-row md:gap-6' : 'flex flex-col gap-5'
      }`}
    >
      <div className={`flex items-center gap-4 ${variant === 'horizontal' ? 'md:w-48 md:flex-col md:items-start' : ''}`}>
        <span className="monogram h-16 w-16 text-xl">{initials}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-semibold leading-snug text-heading">{name}</h3>
          <p className="mt-0.5 text-sm text-on-surface-variant">{t(roleKey)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            {t('common.barCouncilId')}: {barId}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <p className="text-sm leading-6 text-on-surface-variant">{t(bioKey)}</p>

        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {specialties.map((tag) => (
              <span key={tag} className="chip">
                {t(tag)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface">
            <Star className="h-4 w-4 text-gold-ink" aria-hidden="true" />
            {rating.toFixed(1)}
          </span>
          <Link href={`/lawyers/${id}`} className="btn btn-secondary btn-sm">
            {t('common.viewProfile')}
          </Link>
        </div>
      </div>
    </div>
  )
}
