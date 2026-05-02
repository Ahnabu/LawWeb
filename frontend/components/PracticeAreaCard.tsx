interface PracticeAreaCardProps {
  title: string
  description: string
}

export function PracticeAreaCard({ title, description }: PracticeAreaCardProps) {
  return (
    <div className="group rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl text-amber-300 shadow-lg shadow-amber-500/10">⚖️</div>
      <h3 className="text-xl font-semibold text-primary">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
