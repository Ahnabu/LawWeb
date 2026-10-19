interface CaseProgressTrackerProps {
  currentStep?: number
}

const steps = ['Filed', 'Under Review', 'Active', 'Hearing Scheduled', 'Resolved']

export function CaseProgressTracker({ currentStep = 3 }: CaseProgressTrackerProps) {
  return (
    <ol className="grid grid-cols-5">
      {steps.map((step, index) => {
        const done = index < currentStep
        const isLast = index === steps.length - 1
        return (
          <li key={step} className="relative flex flex-col items-center text-center" aria-current={index === currentStep - 1 ? 'step' : undefined}>
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-2.25 h-0.5 w-full ${index + 1 < currentStep ? 'bg-secondary' : 'bg-outline-variant'}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 h-5 w-5 rounded-full border-2 ${
                done
                  ? 'border-[#a8873a] bg-secondary shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]'
                  : 'border-outline bg-surface-raised shadow-[inset_0_1px_2px_rgb(16_24_40/0.1)]'
              }`}
            />
            <span className={`mt-2 wrap-break-word px-0.5 text-[0.7rem] leading-tight sm:text-xs ${done ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
              {step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
