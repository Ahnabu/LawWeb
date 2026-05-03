import Link from 'next/link'
import { Star } from 'lucide-react'

interface LawyerCardProps {
  id: string
  name: string
  role: string
  barId: string
  specialties: string[]
  bio: string
  rating: number
  variant?: 'grid' | 'horizontal'
}

export function LawyerCard({ id, name, role, barId, specialties, bio, rating, variant = 'grid' }: LawyerCardProps) {
  return (
    <div className={`card-elevated p-6 transition hover:-translate-y-0.5 ${variant === 'horizontal' ? 'flex flex-col gap-6 md:flex-row' : ''}`}>
      <div className="placeholder-photo flex h-32 w-32 items-center justify-center overflow-hidden rounded-full text-3xl font-semibold text-on-surface-variant">
        {name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{role}</p>
          <h3 className="font-display text-2xl font-semibold text-on-surface">{name}</h3>
          <p className="text-sm text-on-surface-variant">Bar Council ID: {barId}</p>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {specialties.map((tag) => (
              <span key={tag} className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:w-36 md:flex-col md:items-end">
        <div className="inline-flex items-center gap-1 rounded-md bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface">
          <Star className="h-4 w-4 text-secondary" /> {rating.toFixed(1)}
        </div>
        <Link href={`/lawyers/${id}`} className="rounded-md border border-secondary bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/10">
          View Full Profile
        </Link>
      </div>
    </div>
  )
}
