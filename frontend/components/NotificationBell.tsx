'use client'

import { Bell, CheckCircle, LayoutGrid, Mail, ShieldCheck } from 'lucide-react'
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
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
        aria-label="Toggle notifications"
      >
        <Bell className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">Latest updates for your dashboard</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.title} className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
