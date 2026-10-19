import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface PracticeAreaCardProps {
  title: string
  description: string
  /** Optional "read more" target, e.g. the area's full write-up */
  href?: string
  linkLabel?: string
}

export function PracticeAreaCard({ title, description, href, linkLabel = 'Read more' }: PracticeAreaCardProps) {
  return (
    <div className="card flex h-full flex-col p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold leading-snug text-heading">{title}</h3>
      <hr className="rule my-3 w-10 border-t-secondary/60" />
      <p className="text-sm leading-6 text-on-surface-variant">{description}</p>
      {href && (
        <Link href={href} className="text-link mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-sm">
          {linkLabel}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
