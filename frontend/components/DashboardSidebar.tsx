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
    { label: 'My Cases', href: '/dashboard/client' },
    { label: 'My Appointments', href: '/dashboard/client' },
    { label: 'My Profile', href: '/dashboard/client' },
  ],
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  return (
    <aside className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Dashboard</p>
        <h2 className="text-2xl font-semibold text-primary">{role === 'admin' ? 'Admin Panel' : role === 'lawyer' ? 'Lawyer Dashboard' : 'Client Hub'}</h2>
      </div>
      <nav className="space-y-2">
        {items[role].map((item) => (
          <Link key={item.label} href={item.href} className="block rounded-3xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-primary">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
