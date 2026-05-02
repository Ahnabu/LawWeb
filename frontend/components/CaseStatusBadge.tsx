interface CaseStatusBadgeProps {
  status: 'Filed' | 'Under Review' | 'Active' | 'Hearing Scheduled' | 'Resolved' | 'Closed'
}

const statusMap = {
  Filed: 'bg-slate-100 text-slate-700',
  'Under Review': 'bg-sky-100 text-sky-700',
  Active: 'bg-blue-100 text-blue-700',
  'Hearing Scheduled': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-red-100 text-red-700',
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMap[status]}`}>
      {status}
    </span>
  )
}
