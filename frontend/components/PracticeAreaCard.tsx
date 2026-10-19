interface PracticeAreaCardProps {
  title: string
  description: string
}

export function PracticeAreaCard({ title, description }: PracticeAreaCardProps) {
  return (
    <div className="card h-full p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold leading-snug text-heading">{title}</h3>
      <hr className="rule my-3 w-10 border-t-secondary/60" />
      <p className="text-sm leading-6 text-on-surface-variant">{description}</p>
    </div>
  )
}
