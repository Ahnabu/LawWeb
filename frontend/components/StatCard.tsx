interface StatCardProps {
  label: string
  value: string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-heading">{value}</p>
    </div>
  )
}
