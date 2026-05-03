'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'

const notifications = [
  { title: 'New appointment scheduled', time: '2m ago' },
  { title: 'Case status updated', time: '1h ago' },
  { title: 'New lawyer added', time: 'Yesterday' },
]

export function NotificationBell() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface-variant shadow-sm transition hover:bg-surface-container hover:text-on-surface"
        aria-label="Toggle notifications"
      >
        <Bell className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-xl border border-outline-variant bg-surface p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface">Notifications</p>
              <p className="text-xs text-on-surface-variant">Latest updates for your dashboard</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">×</button>
          </div>
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.title} className="rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">
                <p className="font-semibold text-on-surface">{item.title}</p>
                <p className="mt-1 text-xs">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
