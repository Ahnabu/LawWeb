'use client'

import Image from 'next/image'
import { Mail, Phone } from 'lucide-react'

export interface PublicTeamMember {
  _id: string
  name: string
  role: string
  photoUrl?: string
  phone?: string
  email?: string
  bio?: string
}

/** One member of the firm's administrative and support staff */
export function TeamMemberCard({ name, role, photoUrl, phone, email, bio }: PublicTeamMember) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="card card-interactive flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <Image
            src={photoUrl}
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
          <p className="mt-0.5 text-sm text-on-surface-variant" title={role}>
            {role}
          </p>
        </div>
      </div>

      {bio && <p className="mt-4 text-sm leading-6 text-on-surface-variant">{bio}</p>}

      {(phone || email) && (
        <div className="mt-auto space-y-1.5 pt-5 text-sm">
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-on-surface">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-2 break-all text-on-surface-variant transition-colors hover:text-on-surface">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              {email}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
