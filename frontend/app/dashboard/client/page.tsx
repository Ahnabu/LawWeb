import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { DashboardSidebar } from '../../../components/DashboardSidebar'
import { StatCard } from '../../../components/StatCard'
import { clientAppointments, clientCases, clientStats } from '../../../lib/data'

export default function ClientDashboardPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
          <DashboardSidebar role="client" />
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Client Dashboard</p>
                  <h1 className="mt-3 text-3xl font-semibold text-primary">Your Legal Overview</h1>
                </div>
                <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Client View</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {clientStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <h2 className="text-2xl font-semibold text-primary">My Cases</h2>
              <div className="mt-6 space-y-4">
                {clientCases.map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-900">{entry.id}</p>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{entry.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{entry.type} case in progress.</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <h2 className="text-2xl font-semibold text-primary">My Appointments</h2>
              <div className="mt-6 space-y-4">
                {clientAppointments.map((appointment) => (
                  <div key={`${appointment.date}-${appointment.time}`} className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">{appointment.date} • {appointment.time}</p>
                    <p className="mt-2 font-semibold text-slate-900">Lawyer: {appointment.lawyer}</p>
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
