import { CaseProgressTracker } from '../../components/CaseProgressTracker'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'

export default function TrackCasePage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl card-elevated p-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Track Your Case</p>
            <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">Track Your Case</h1>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Enter your Case ID or Email Address to view the latest status and next scheduled hearing.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
            <input type="text" placeholder="Case ID or Email Address" className="w-full" />
            <button type="button" className="rounded-md bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-gold/90">Track Now</button>
          </div>
          <div className="mt-12 rounded-xl border border-outline-variant bg-surface-container p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Case Status</p>
                <h2 className="mt-3 font-display text-3xl font-semibold text-on-surface">CAS-2025-089</h2>
              </div>
              <span className="rounded-md bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant">Last updated: 1 hour ago</span>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl bg-surface p-6">
                <p className="text-sm text-on-surface-variant">Client Name</p>
                <p className="mt-2 font-semibold text-on-surface">M. Rahman</p>
                <p className="mt-4 text-sm text-on-surface-variant">Assigned Lawyer</p>
                <p className="mt-2 font-semibold text-on-surface">Nazrul Islam</p>
              </div>
              <div className="rounded-xl bg-surface p-6">
                <p className="text-sm text-on-surface-variant">Case Type</p>
                <p className="mt-2 font-semibold text-on-surface">Immigration</p>
                <p className="mt-4 text-sm text-on-surface-variant">Next Appointment</p>
                <p className="mt-2 font-semibold text-on-surface">12 Jun 2025</p>
              </div>
            </div>
            <div className="mt-10">
              <CaseProgressTracker currentStep={4} />
            </div>
            <div className="mt-10 rounded-xl bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Lawyer Notes</p>
              <p className="mt-3 text-on-surface-variant">The case has moved to active review and the next hearing date has been scheduled. Please prepare the documents requested in the previous email.</p>
            </div>
          </div>
          <div className="mt-10 rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
            No case found? Please check your Case ID or contact us directly. For offline cases, please check the email we sent you with your Case ID.
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
