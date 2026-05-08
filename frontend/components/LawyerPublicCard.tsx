import Link from 'next/link'
import { Scale } from 'lucide-react'

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

  return (
    <div className="group card-elevated flex flex-col overflow-hidden border border-outline-variant bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="h-1 bg-accent-gradient" />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="placeholder-photo flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-on-surface-variant ring-1 ring-outline-variant sm:h-20 sm:w-20 sm:text-2xl">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
              Attorney at Law
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-on-surface sm:text-xl">
              {name}
            </h3>
            {barId && (
              <p className="mt-0.5 text-xs text-on-surface-variant">Bar ID: {barId}</p>
            )}
          </div>
        </div>

        {specialization && (
          <div className="flex flex-wrap gap-2">
            {specialization.split(',').map((s) => (
              <span
                key={s.trim()}
                className="rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1 text-[0.7rem] font-semibold text-secondary"
              >
                {s.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Scale className="h-3.5 w-3.5 text-secondary" />
            <span>Islam &amp; Associates</span>
          </div>
          <Link
            href={`/lawyers/${_id}`}
            className="inline-flex items-center rounded-full border border-secondary bg-surface px-4 py-1.5 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-primary"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
