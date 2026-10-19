import Link from 'next/link'

interface LawyerPublicCardProps {
  _id: string
  name: string
  barId?: string
  specialization?: string
}

export function LawyerPublicCard({ _id, name, barId, specialization }: LawyerPublicCardProps) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const specialties = specialization
    ? specialization
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  return (
    <div className="card card-interactive flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="monogram h-14 w-14 text-lg">{initials}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-snug text-heading">{name}</h3>
          <p className="mt-0.5 text-sm text-on-surface-variant">Attorney at Law</p>
        </div>
      </div>

      {specialties.length > 0 && (
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">{specialties.join(' · ')}</p>
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
