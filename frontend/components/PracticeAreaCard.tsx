interface PracticeAreaCardProps {
  title: string
  description: string
}

// A static teaser card (home and Practice Areas pages). The full write-ups are
// the accordions on /practice-areas/all, reached through a single "See more" button.
export function PracticeAreaCard({ title, description }: PracticeAreaCardProps) {
  return (
    <div className="card flex h-full flex-col p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold leading-snug text-heading">{title}</h3>
      <hr className="rule my-3 w-10 border-t-secondary/60" />
      <p className="line-clamp-4 text-sm leading-6 text-on-surface-variant">{description}</p>
    </div>
  )
}
