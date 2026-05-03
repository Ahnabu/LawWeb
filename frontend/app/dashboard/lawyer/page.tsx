import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { DashboardSidebar } from '../../../components/DashboardSidebar'
import { NotificationBell } from '../../../components/NotificationBell'
import { StatCard } from '../../../components/StatCard'
import { lawyerAppointments, lawyerCases, lawyerStats } from '../../../lib/data'

export default function LawyerDashboardPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
          <DashboardSidebar role="lawyer" />
          <div className="space-y-8">
            <div className="card-elevated flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">My Overview</p>
                <h1 className="mt-3 font-display text-3xl font-semibold text-on-surface">My Dashboard</h1>
              </div>
              <NotificationBell />
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {lawyerStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="card-elevated p-8">
              <h2 className="font-display text-2xl font-semibold text-on-surface">Today&apos;s Appointments</h2>
              <div className="mt-6 grid gap-4">
                {lawyerAppointments.map((item) => (
                  <div key={item.time} className="rounded-xl bg-surface-container p-5">
                    <p className="text-sm text-on-surface-variant">{item.time}</p>
                    <p className="mt-2 text-lg font-semibold text-on-surface">{item.client}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-8">
              <h2 className="font-display text-2xl font-semibold text-on-surface">My Cases</h2>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-on-surface-variant">
                  <thead className="border-b border-outline-variant text-on-surface">
                    <tr>
                      <th className="py-4">Case ID</th>
                      <th className="py-4">Type</th>
                      <th className="py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lawyerCases.map((entry) => (
                      <tr key={entry.id} className="border-b border-outline-variant hover:bg-surface-container">
                        <td className="py-4 font-semibold text-on-surface">{entry.id}</td>
                        <td className="py-4">{entry.type}</td>
                        <td className="py-4 text-on-surface-variant">{entry.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
