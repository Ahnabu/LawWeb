import Link from 'next/link'
import { type ReactNode } from 'react'
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
    <div className={`rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl ${variant === 'horizontal' ? 'flex flex-col md:flex-row gap-6' : ''}`}>
      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-3xl font-semibold text-slate-400 placeholder-photo">
        {name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.24em] text-amber-600">{role}</p>
          <h3 className="text-2xl font-semibold text-primary">{name}</h3>
          <p className="text-sm text-slate-500">Bar Council ID: {barId}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {specialties.map((tag) => (
              <span key={tag} className="rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:w-36 md:flex-col md:items-end">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
          <Star className="h-4 w-4 text-amber-500" /> {rating.toFixed(1)}
        </div>
        <Link href={`/lawyers/${id}`} className="rounded-full border border-amber-500 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
          View Full Profile
        </Link>
      </div>
    </div>
  )
}
