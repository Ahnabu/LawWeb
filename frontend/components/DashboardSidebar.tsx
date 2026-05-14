'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarClock,
  Briefcase,
  UserCircle,
  PlusCircle,
  Users,
  Scale,
  Clock,
  ShieldCheck,
  BarChart3,
  Newspaper,
  LogOut,
} from 'lucide-react'
import { useAuth } from './AuthProvider'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  exact?: boolean
}

const clientItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard/client', icon: <LayoutDashboard size={16} />, exact: true },
  { label: 'Book Consultation', href: '/dashboard/client/book-consultation', icon: <PlusCircle size={16} /> },
  { label: 'My Appointments', href: '/dashboard/client/appointment', icon: <CalendarClock size={16} /> },
  { label: 'Profile', href: '/profile', icon: <UserCircle size={16} /> },
]

const lawyerItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard/lawyer', icon: <LayoutDashboard size={16} />, exact: true },
  { label: 'My Cases', href: '/dashboard/lawyer#cases', icon: <Briefcase size={16} /> },
  { label: 'Appointments', href: '/dashboard/lawyer#appointments', icon: <CalendarClock size={16} /> },
  { label: 'Availability', href: '/dashboard/lawyer#availability', icon: <Clock size={16} /> },
  { label: 'Profile', href: '/profile', icon: <UserCircle size={16} /> },
]

const adminItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard/admin', icon: <BarChart3 size={16} />, exact: true },
  { label: 'Cases', href: '/dashboard/admin#cases', icon: <Scale size={16} /> },
  { label: 'Lawyers', href: '/dashboard/admin/lawyers', icon: <ShieldCheck size={16} /> },
  { label: 'Appointments', href: '/dashboard/admin#appointments', icon: <CalendarClock size={16} /> },
  { label: 'Clients', href: '/dashboard/admin#clients', icon: <Users size={16} /> },
  { label: 'Blogs', href: '/dashboard/admin/blogs', icon: <Newspaper size={16} /> },
]

const itemsByRole = { admin: adminItems, lawyer: lawyerItems, client: clientItems }

const roleLabels = {
  admin: 'Admin Panel',
  lawyer: 'Lawyer Hub',
  client: 'Client Hub',
}

interface DashboardSidebarProps {
  role: 'admin' | 'lawyer' | 'client'
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
        isActive
          ? 'bg-primary text-on-primary shadow-sm'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      <span className={isActive ? 'text-on-primary' : 'text-secondary'}>{item.icon}</span>
      {item.label}
    </Link>
  )
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const items = itemsByRole[role]

  const isActive = (item: NavItem) => {
    if (item.href.includes('#')) return pathname === item.href.split('#')[0]
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="card-elevated flex flex-col gap-6 p-4 sm:p-6 lg:sticky lg:top-6 lg:self-start">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary">
          <Scale size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Dashboard</p>
          <h2 className="font-display text-base font-semibold text-on-surface">{roleLabels[role]}</h2>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3">
          <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant truncate">{user.email}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.label} item={item} isActive={isActive(item)} />
        ))}
      </nav>

      {/* Logout */}
      <button
        type="button"
        onClick={() => logout()}
        className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-all hover:bg-error/10 hover:text-error"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </aside>
  )
}
