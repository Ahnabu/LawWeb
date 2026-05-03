import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { DashboardSidebar } from '../../../components/DashboardSidebar'
import { StatCard } from '../../../components/StatCard'
import { clientAppointments, clientCases, clientStats } from '../../../lib/data'

export default function ClientDashboardPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
          <DashboardSidebar role="client" />
          <div className="space-y-8">
            <div className="card-elevated p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Client Dashboard</p>
                  <h1 className="mt-3 font-display text-3xl font-semibold text-on-surface">Your Legal Overview</h1>
                </div>
                <p className="rounded-md bg-success/10 px-4 py-2 text-sm font-semibold text-success">Client View</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {clientStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="card-elevated p-8">
              <h2 className="font-display text-2xl font-semibold text-on-surface">My Cases</h2>
              <div className="mt-6 space-y-4">
                {clientCases.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-outline-variant bg-surface-container p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-on-surface">{entry.id}</p>
                      <span className="rounded-md bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">{entry.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">{entry.type} case in progress.</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-8">
              <h2 className="font-display text-2xl font-semibold text-on-surface">My Appointments</h2>
              <div className="mt-6 space-y-4">
                {clientAppointments.map((appointment) => (
                  <div key={`${appointment.date}-${appointment.time}`} className="rounded-xl bg-surface-container p-5">
                    <p className="text-sm text-on-surface-variant">{appointment.date} • {appointment.time}</p>
                    <p className="mt-2 font-semibold text-on-surface">Lawyer: {appointment.lawyer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
