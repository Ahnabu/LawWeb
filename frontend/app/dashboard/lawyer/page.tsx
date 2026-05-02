import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { DashboardSidebar } from '../../../components/DashboardSidebar'
import { NotificationBell } from '../../../components/NotificationBell'
import { StatCard } from '../../../components/StatCard'
import { lawyerAppointments, lawyerCases, lawyerStats } from '../../../lib/data'

export default function LawyerDashboardPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
          <DashboardSidebar role="lawyer" />
          <div className="space-y-8">
            <div className="flex flex-col gap-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-600">My Overview</p>
                <h1 className="mt-3 text-3xl font-semibold text-primary">My Dashboard</h1>
              </div>
              <NotificationBell />
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {lawyerStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <h2 className="text-2xl font-semibold text-primary">Today&apos;s Appointments</h2>
              <div className="mt-6 grid gap-4">
                {lawyerAppointments.map((item) => (
                  <div key={item.time} className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">{item.time}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{item.client}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <h2 className="text-2xl font-semibold text-primary">My Cases</h2>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 text-slate-900">
                    <tr>
                      <th className="py-4">Case ID</th>
                      <th className="py-4">Type</th>
                      <th className="py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lawyerCases.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-4 font-semibold text-slate-900">{entry.id}</td>
                        <td className="py-4">{entry.type}</td>
                        <td className="py-4 text-slate-700">{entry.status}</td>
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
