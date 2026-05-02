interface CaseProgressTrackerProps {
  currentStep?: number
}

const steps = ['Filed', 'Under Review', 'Active', 'Hearing Scheduled', 'Resolved']

export function CaseProgressTracker({ currentStep = 3 }: CaseProgressTrackerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
        {steps.map((step, index) => (
          <span key={step} className={index < currentStep ? 'text-slate-900' : 'text-slate-400'}>
            {step}
          </span>
        ))}
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="absolute left-0 top-0 h-full rounded-full bg-amber-500" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} />
      </div>
    </div>
  )
}
