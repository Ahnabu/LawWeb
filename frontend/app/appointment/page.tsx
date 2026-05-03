import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { AppointmentWidget } from '../../components/AppointmentWidget'

export default function AppointmentPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row">
          <div className="space-y-6 flex-1">
            <div className="card-elevated p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Book a Consultation</p>
              <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">Book a Consultation</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
                Choose from an appointment form or start a direct conversation on WhatsApp with our legal team.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card-elevated p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Fill the Appointment Form</p>
                <p className="mt-4 text-on-surface-variant">Provide your details and case summary to receive confirmation within 24 hours.</p>
              </div>
              <div className="card-elevated p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">WhatsApp Us Directly</p>
                <p className="mt-4 text-on-surface-variant">Send a quick message to our legal support team with your preferred language.</p>
              </div>
            </div>
            <div className="card-elevated p-10">
              <form className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Full Name *
                    <input type="text" placeholder="Your full name" className="w-full" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Email Address *
                    <input type="email" placeholder="you@example.com" className="w-full" />
                  </label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Phone Number *
                    <input type="tel" placeholder="+880 17XXXXXXXX" className="w-full" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Preferred Language
                    <select className="w-full">
                      <option>English</option>
                      <option>বাংলা</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Select Lawyer
                    <select className="w-full">
                      <option>Mufassil MM Islam</option>
                      <option>Nazrul Islam</option>
                      <option>Sadequr Rahman</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Practice Area / Legal Issue
                    <select className="w-full">
                      <option>Immigration Law</option>
                      <option>Corporate Law</option>
                      <option>Civil Litigation</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                    Preferred Date
                    <input type="date" className="w-full" />
                  </label>
                  <fieldset className="space-y-3 rounded-md border border-outline-variant bg-surface-container p-4 text-sm text-on-surface-variant">
                    <legend className="text-sm font-semibold">Preferred Time Slot</legend>
                    <div className="flex flex-wrap gap-3">
                      {['Morning', 'Afternoon', 'Evening'].map((slot) => (
                        <button key={slot} type="button" className="rounded-md border border-outline-variant bg-surface px-4 py-2 text-sm transition hover:border-gold hover:text-gold">
                          {slot}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                  Brief Description of Issue
                  <textarea rows={4} placeholder="Describe your legal matter" className="w-full" />
                </label>
                <label className="space-y-2 text-sm font-medium text-on-surface-variant">
                  Case Type
                  <select className="w-full">
                    <option>Online Consultation</option>
                    <option>In-Person Visit</option>
                  </select>
                </label>
                <button type="submit" className="w-full rounded-md bg-gold px-6 py-4 text-sm font-semibold text-navy transition hover:bg-gold/90">
                  Submit Appointment Request
                </button>
              </form>
            </div>
          </div>
          <div className="lg:w-[360px]">
            <AppointmentWidget />
          </div>
        </div>
      </section>
      <section className="bg-success/10 px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl card-elevated border-success/30 p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success">Confirmation</p>
              <h2 className="mt-4 font-display text-3xl font-semibold text-on-surface">We&apos;ll contact you within 24 hours.</h2>
            </div>
            <div className="inline-flex items-center gap-3 rounded-md bg-success px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-success/20">
              ✔️ Success
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-on-surface-variant">Check your email for confirmation and a follow-up from our legal team. We are committed to handling your case with professionalism and care.</p>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
