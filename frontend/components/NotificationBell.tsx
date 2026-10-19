'use client'

import { Bell, Briefcase, CalendarClock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../lib/api'
import { apiFetch } from '../lib/http'

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
    apiFetch(`${API_BASE_URL}/api/consultations/notifications`, { credentials: 'include' })
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
        className="btn btn-secondary btn-icon relative text-on-surface-variant"
        aria-label="Toggle notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-surface-raised bg-error px-0.5 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface">Notifications</p>
              <p className="text-xs text-on-surface-variant">Recent activity</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="btn btn-ghost btn-icon -mr-2 text-lg leading-none">×</button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-container" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-variant">No recent activity</p>
          ) : (
            <div className="divide-y divide-outline-variant">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <span className="mt-0.5 shrink-0 text-gold-ink">
                    {item.type === 'appointment' ? <CalendarClock className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="truncate text-xs text-on-surface-variant">{item.body}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{timeAgo(item.time)}</p>
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
