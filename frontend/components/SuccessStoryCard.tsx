interface SuccessStoryCardProps {
  title: string
  summary: string
  initials: string
  quote: string
  badge: string
}

export function SuccessStoryCard({ title, summary, initials, quote, badge }: SuccessStoryCardProps) {
  return (
    <div className="rounded-[2rem] border-l-4 border-amber-400 bg-white p-6 shadow-xl">
      <span className="text-xs uppercase tracking-[0.3em] text-amber-700">{badge}</span>
      <h3 className="mt-4 text-xl font-semibold text-primary">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p>
      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">{initials}</div>
        <blockquote className="text-sm italic text-slate-600">“{quote}”</blockquote>
      </div>
    </div>
  )
}
