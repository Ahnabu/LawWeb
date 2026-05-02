import { CaseProgressTracker } from '../../components/CaseProgressTracker'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'

export default function TrackCasePage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Track Your Case</p>
            <h1 className="mt-4 text-5xl font-semibold text-primary">Track Your Case</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Enter your Case ID or Email Address to view the latest status and next scheduled hearing.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
            <input type="text" placeholder="Case ID or Email Address" className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none transition focus:border-amber-400" />
            <button type="button" className="rounded-3xl bg-amber-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-amber-600">Track Now</button>
          </div>
          <div className="mt-12 rounded-[2rem] border border-slate-200/80 bg-slate-50 p-8 shadow-inner">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Case Status</p>
                <h2 className="mt-3 text-3xl font-semibold text-primary">CAS-2025-089</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Last updated: 1 hour ago</span>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Client Name</p>
                <p className="mt-2 font-semibold text-slate-900">M. Rahman</p>
                <p className="mt-4 text-sm text-slate-500">Assigned Lawyer</p>
                <p className="mt-2 font-semibold text-slate-900">Nazrul Islam</p>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Case Type</p>
                <p className="mt-2 font-semibold text-slate-900">Immigration</p>
                <p className="mt-4 text-sm text-slate-500">Next Appointment</p>
                <p className="mt-2 font-semibold text-slate-900">12 Jun 2025</p>
              </div>
            </div>
            <div className="mt-10">
              <CaseProgressTracker currentStep={4} />
            </div>
            <div className="mt-10 rounded-[2rem] bg-white p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-amber-700">Lawyer Notes</p>
              <p className="mt-3 text-slate-600">The case has moved to active review and the next hearing date has been scheduled. Please prepare the documents requested in the previous email.</p>
            </div>
          </div>
          <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            No case found? Please check your Case ID or contact us directly. For offline cases, please check the email we sent you with your Case ID.
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
