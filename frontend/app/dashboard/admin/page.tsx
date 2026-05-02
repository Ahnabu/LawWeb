import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { DashboardSidebar } from '../../../components/DashboardSidebar'
import { NotificationBell } from '../../../components/NotificationBell'
import { StatCard } from '../../../components/StatCard'
import { adminCases, adminStats, upcomingAppointments } from '../../../lib/data'

const actions = ['Add Case', 'Add Lawyer', 'Send Notification']

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid gap-10 lg:grid-cols-[280px_1fr]">
          <DashboardSidebar role="admin" />
          <div className="space-y-8">
            <div className="flex flex-col gap-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Overview</p>
                <h1 className="mt-3 text-3xl font-semibold text-primary">Admin Dashboard</h1>
              </div>
              <NotificationBell />
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {adminStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Recent Cases</p>
                  <h2 className="mt-3 text-2xl font-semibold text-primary">Recent Cases</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {actions.map((action) => (
                    <button key={action} type="button" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
                      + {action}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 text-slate-900">
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
                      <tr key={entry.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-4 font-semibold text-slate-900">{entry.id}</td>
                        <td className="py-4">{entry.client}</td>
                        <td className="py-4">{entry.lawyer}</td>
                        <td className="py-4">{entry.type}</td>
                        <td className="py-4 font-semibold text-amber-700">{entry.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <h2 className="text-2xl font-semibold text-primary">Upcoming Appointments</h2>
                <div className="mt-6 space-y-4">
                  {upcomingAppointments.map((item) => (
                    <div key={item.time} className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">{item.time}</p>
                      <p className="mt-1 font-semibold text-slate-900">{item.client}</p>
                      <p className="text-sm text-slate-600">Lawyer: {item.lawyer}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <h2 className="text-2xl font-semibold text-primary">Activity Feed</h2>
                <div className="mt-6 space-y-4 text-sm text-slate-600">
                  <p>New case added for corporate client.</p>
                  <p>Mail notification dispatched to new client.</p>
                  <p>Lawyer profile updated with new credentials.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
