interface PracticeAreaCardProps {
  title: string
  description: string
}

export function PracticeAreaCard({ title, description }: PracticeAreaCardProps) {
  return (
    <div className="card-elevated group p-6 transition hover:-translate-y-0.5">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-xl text-gold shadow-sm">⚖️</div>
      <h3 className="text-xl font-semibold text-on-surface">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{description}</p>
    </div>
  )
}
