import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { DashboardSidebar } from '../../../components/DashboardSidebar'
import { NotificationBell } from '../../../components/NotificationBell'
import { StatCard } from '../../../components/StatCard'
import { adminCases, adminStats, upcomingAppointments } from '../../../lib/data'
import { AuthGate } from '../../../components/AuthGate'

const actions = ['Add Case', 'Add Lawyer', 'Send Notification']

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <AuthGate allowRoles={['admin']}>
        <section className="px-6 pb-16 pt-6 sm:px-8 sm:pb-16 sm:pt-8 lg:px-10 lg:pb-16 lg:pt-10">
          <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
            <DashboardSidebar role="admin" />
            <div className="space-y-8">
              <div className="card-elevated flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Overview</p>
                  <h1 className="mt-3 font-display text-3xl font-semibold text-on-surface">Admin Dashboard</h1>
                </div>
                <NotificationBell />
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {adminStats.map((stat) => (
                  <StatCard key={stat.label} {...stat} />
                ))}
              </div>
              <div className="card-elevated p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Recent Cases</p>
                    <h2 className="mt-3 font-display text-2xl font-semibold text-on-surface">Recent Cases</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {actions.map((action) => (
                      <button key={action} type="button" className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary/90">
                        + {action}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-on-surface-variant">
                    <thead className="border-b border-outline-variant text-on-surface">
                      <tr>
                        <th className="py-4">Case ID</th>
                        <th className="py-4">Client</th>
                        <th className="py-4">Lawyer</th>
                        <th className="py-4">Type</th>
                        <th className="py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminCases.map((entry) => (
                        <tr key={entry.id} className="border-b border-outline-variant hover:bg-surface-container">
                          <td className="py-4 font-semibold text-on-surface">{entry.id}</td>
                          <td className="py-4">{entry.client}</td>
                          <td className="py-4">{entry.lawyer}</td>
                          <td className="py-4">{entry.type}</td>
                          <td className="py-4 font-semibold text-secondary">{entry.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                <div className="card-elevated p-8">
                  <h2 className="font-display text-2xl font-semibold text-on-surface">Upcoming Appointments</h2>
                  <div className="mt-6 space-y-4">
                    {upcomingAppointments.map((item) => (
                      <div key={item.time} className="rounded-xl bg-surface-container p-4">
                        <p className="text-sm text-on-surface-variant">{item.time}</p>
                        <p className="mt-1 font-semibold text-on-surface">{item.client}</p>
                        <p className="text-sm text-on-surface-variant">Lawyer: {item.lawyer}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-elevated p-8">
                  <h2 className="font-display text-2xl font-semibold text-on-surface">Activity Feed</h2>
                  <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
                    <p>New case added for corporate client.</p>
                    <p>Mail notification dispatched to new client.</p>
                    <p>Lawyer profile updated with new credentials.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AuthGate>
      <Footer />
    </main>
  )
}
