interface StatCardProps {
  label: string
  value: string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="card-elevated p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-on-surface">{value}</p>
    </div>
  )
}
