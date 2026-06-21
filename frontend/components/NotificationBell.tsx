'use client'

import { Bell, Briefcase, CalendarClock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../lib/api'

interface Notification {
  id: string
  title: string
  body: string
  time: string
  type: 'appointment' | 'case'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    setLoading(true)
    fetch(`${API_BASE_URL}/api/consultations/notifications`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const items: Notification[] = data.notifications || []
        setNotifications(items)
        setUnread(items.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleOpen = () => {
    setOpen((prev) => !prev)
    setUnread(0)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface text-on-surface-variant shadow-sm transition hover:bg-surface-container hover:text-on-surface"
        aria-label="Toggle notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-xl border border-outline-variant bg-surface p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface">Notifications</p>
              <p className="text-xs text-on-surface-variant">Recent activity</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-lg leading-none text-on-surface-variant hover:text-on-surface">×</button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-variant">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl bg-surface-container p-3 text-sm">
                  <span className="mt-0.5 shrink-0 text-secondary">
                    {item.type === 'appointment' ? <CalendarClock className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="truncate text-xs text-on-surface-variant">{item.body}</p>
                    <p className="mt-1 text-xs text-on-surface-variant opacity-60">{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
