interface SuccessStoryCardProps {
  title: string
  summary: string
  initials: string
  quote: string
  badge: string
}

export function SuccessStoryCard({ title, summary, initials, quote, badge }: SuccessStoryCardProps) {
  return (
    <figure className="card flex h-full flex-col p-5 sm:p-6">
      <p className="text-xs font-semibold text-gold-ink">{badge}</p>
      <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-heading">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{summary}</p>
      <hr className="rule mb-4 mt-5" />
      <figcaption className="mt-auto flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-xs font-semibold text-on-surface-variant">
          {initials}
        </span>
        <blockquote className="text-sm italic leading-6 text-on-surface-variant">&ldquo;{quote}&rdquo;</blockquote>
      </figcaption>
    </figure>
  )
}
