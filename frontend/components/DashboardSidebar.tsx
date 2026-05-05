import Link from 'next/link'

interface DashboardSidebarProps {
  role: 'admin' | 'lawyer' | 'client'
}

const items = {
  admin: [
    { label: 'Overview', href: '/dashboard/admin' },
    { label: 'Manage Lawyers', href: '/dashboard/admin' },
    { label: 'All Cases', href: '/dashboard/admin' },
    { label: 'Add New Case', href: '/dashboard/admin' },
    { label: 'Appointments', href: '/dashboard/admin' },
    { label: 'Clients', href: '/dashboard/admin' },
    { label: 'Settings', href: '/dashboard/admin' },
  ],
  lawyer: [
    { label: 'My Overview', href: '/dashboard/lawyer' },
    { label: 'My Cases', href: '/dashboard/lawyer' },
    { label: 'My Appointments', href: '/dashboard/lawyer' },
    { label: 'My Profile', href: '/dashboard/lawyer' },
  ],
  client: [
    { label: 'Home', href: '/dashboard/client' },
    { label: 'Book Consultation', href: '/dashboard/client/book-consultation' },
    { label: 'My Cases', href: '/dashboard/client' },
    { label: 'My Appointments', href: '/dashboard/client' },
    { label: 'My Profile', href: '/dashboard/client' },
  ],
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  return (
    <aside className="card-elevated space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Dashboard</p>
        <h2 className="font-display text-lg sm:text-2xl font-semibold text-on-surface">{role === 'admin' ? 'Admin Panel' : role === 'lawyer' ? 'Lawyer Dashboard' : 'Client Hub'}</h2>
      </div>
      <nav className="space-y-1 sm:space-y-2">
        {items[role].map((item) => (
          <Link key={item.label} href={item.href} className="block rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-secondary">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
