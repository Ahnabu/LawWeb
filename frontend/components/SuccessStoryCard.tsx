interface SuccessStoryCardProps {
  title: string
  summary: string
  initials: string
  quote: string
  badge: string
}

export function SuccessStoryCard({ title, summary, initials, quote, badge }: SuccessStoryCardProps) {
  return (
    <div className="rounded-lg sm:rounded-[20px] border-l-4 border-secondary bg-surface p-4 sm:p-6 shadow-sm dark:bg-surface-container">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{badge}</span>
      <h3 className="mt-3 sm:mt-4 font-display text-base sm:text-xl font-semibold text-on-surface">{title}</h3>
      <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-5 sm:leading-6 text-on-surface-variant">{summary}</p>
      <div className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-surface-container text-sm sm:text-lg font-semibold text-on-surface-variant flex-shrink-0">{initials}</div>
        <blockquote className="text-xs sm:text-sm italic text-on-surface-variant">&ldquo;{quote}&rdquo;</blockquote>
      </div>
    </div>
  )
}
