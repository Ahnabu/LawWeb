import Link from 'next/link'

interface PracticeAreaCardProps {
  title: string
  description: string
  slug?: string
  /** Base path for the detail page (supports locale prefixed paths) */
  detailBasePath?: string
}

// A teaser card that links to the full write-up accordion on /practice-areas/all#slug.
export function PracticeAreaCard({
  title,
  description,
  slug,
  detailBasePath = '/practice-areas/all',
}: PracticeAreaCardProps) {
  const href = slug ? `${detailBasePath}#${slug}` : `${detailBasePath}`

  return (
    <Link
      href={href}
      className="card group flex h-full flex-col p-5 transition-all duration-200 hover:ring-2 hover:ring-secondary/60 hover:shadow-lg hover:scale-[1.02] sm:p-6"
    >
      <h3 className="font-display text-lg font-semibold leading-snug text-heading group-hover:text-secondary transition-colors">
        {title}
      </h3>
      <hr className="rule my-3 w-10 border-t-secondary/60" />
      <p className="line-clamp-4 text-sm leading-6 text-on-surface-variant">{description}</p>
      <span className="mt-auto pt-4 text-xs font-semibold text-secondary opacity-0 transition-opacity group-hover:opacity-100">
        View details →
      </span>
    </Link>
  )
}
