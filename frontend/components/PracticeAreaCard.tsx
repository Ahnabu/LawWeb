interface PracticeAreaCardProps {
  title: string
  description: string
}

export function PracticeAreaCard({ title, description }: PracticeAreaCardProps) {
  return (
    <div className="card-elevated group p-4 sm:p-6 transition hover:-translate-y-0.5">
      <div className="mb-4 sm:mb-5 inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-xl bg-primary text-base sm:text-xl text-secondary shadow-sm">⚖️</div>
      <h3 className="text-base sm:text-xl font-semibold text-on-surface">{title}</h3>
      <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-5 sm:leading-6 text-on-surface-variant">{description}</p>
    </div>
  )
}
