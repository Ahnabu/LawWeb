interface CaseStatusBadgeProps {
  status: 'Filed' | 'Under Review' | 'Active' | 'Hearing Scheduled' | 'Resolved' | 'Closed'
}

// Muted dot colours; the label itself stays in the neutral chip style
const dotMap = {
  Filed: 'bg-slate-400',
  'Under Review': 'bg-sky-500',
  Active: 'bg-blue-600',
  'Hearing Scheduled': 'bg-amber-500',
  Resolved: 'bg-emerald-600',
  Closed: 'bg-red-600',
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  return (
    <span className="chip">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotMap[status]}`} />
      {status}
    </span>
  )
}
