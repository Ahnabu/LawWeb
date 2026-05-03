interface SuccessStoryCardProps {
  title: string
  summary: string
  initials: string
  quote: string
  badge: string
}

export function SuccessStoryCard({ title, summary, initials, quote, badge }: SuccessStoryCardProps) {
  return (
    <div className="rounded-[20px] border-l-4 border-gold bg-surface p-6 shadow-sm dark:bg-surface-container">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{badge}</span>
      <h3 className="mt-4 font-display text-xl font-semibold text-on-surface">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{summary}</p>
      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-lg font-semibold text-on-surface-variant">{initials}</div>
        <blockquote className="text-sm italic text-on-surface-variant">&ldquo;{quote}&rdquo;</blockquote>
      </div>
    </div>
  )
}
