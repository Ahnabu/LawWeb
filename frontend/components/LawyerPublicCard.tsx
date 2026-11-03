'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from './LanguageProvider'
import { feeParts, type ConsultationFee } from '../lib/fees'

export interface PublicLawyer {
  _id: string
  name: string
  barId?: string
  specialization?: string
  profileImageUrl?: string
  designation?: { en?: string; bn?: string }
  consultationFee?: ConsultationFee
}

export function LawyerPublicCard({ _id, name, barId, specialization, profileImageUrl, designation, consultationFee }: PublicLawyer) {
  const { locale } = useLanguage()
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const title = designation?.[locale] || designation?.en || 'Attorney at Law'

  const specialties = specialization
    ? specialization
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const [mainFee, ...otherFees] = feeParts(consultationFee)

  return (
    <div className="card card-interactive flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {profileImageUrl ? (
          <Image
            src={profileImageUrl}
            alt={name}
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 rounded-full border border-outline-variant object-cover shadow-[0_1px_2px_rgb(16_24_40/0.12)]"
          />
        ) : (
          <span className="monogram h-14 w-14 text-lg">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-snug text-heading">{name}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant" title={title}>
            {title}
          </p>
        </div>
      </div>

      {specialties.length > 0 && (
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">{specialties.join(' · ')}</p>
      )}

      {mainFee && (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 text-sm text-on-surface-variant">
          Consultation for
          <span className="font-display text-base font-semibold text-heading tabular-nums">{mainFee}</span>
          {otherFees.length > 0 && <span className="tabular-nums">({otherFees.join(' / ')})</span>}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        {barId ? <p className="text-xs text-on-surface-variant">Bar ID: {barId}</p> : <span />}
        <Link href={`/lawyers/${_id}`} className="btn btn-secondary btn-sm">
          View Profile
        </Link>
      </div>
    </div>
  )
}
