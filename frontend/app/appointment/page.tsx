import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { AppointmentWidget } from '../../components/AppointmentWidget'

export default function AppointmentPage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Book a Consultation</p>
              <h1 className="mt-4 text-5xl font-semibold text-primary">Book a Consultation</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Choose from an appointment form or start a direct conversation on WhatsApp with our legal team.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Fill the Appointment Form</p>
                <p className="mt-4 text-slate-600">Provide your details and case summary to receive confirmation within 24 hours.</p>
              </div>
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <p className="text-sm uppercase tracking-[0.28em] text-amber-600">WhatsApp Us Directly</p>
                <p className="mt-4 text-slate-600">Send a quick message to our legal support team with your preferred language.</p>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-10 shadow-xl">
              <form className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    Full Name *
                    <input type="text" placeholder="Your full name" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    Email Address *
                    <input type="email" placeholder="you@example.com" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
                  </label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    Phone Number *
                    <input type="tel" placeholder="+880 17XXXXXXXX" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    Preferred Language
                    <select className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400">
                      <option>English</option>
                      <option>বাংলা</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    Select Lawyer
                    <select className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400">
                      <option>Mufassil MM Islam</option>
                      <option>Nazrul Islam</option>
                      <option>Sadequr Rahman</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    Practice Area / Legal Issue
                    <select className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400">
                      <option>Immigration Law</option>
                      <option>Corporate Law</option>
                      <option>Civil Litigation</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    Preferred Date
                    <input type="date" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
                  </label>
                  <fieldset className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <legend className="text-sm font-semibold">Preferred Time Slot</legend>
                    <div className="flex flex-wrap gap-3">
                      {['Morning', 'Afternoon', 'Evening'].map((slot) => (
                        <button key={slot} type="button" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm transition hover:border-amber-400">
                          {slot}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <label className="space-y-2 text-sm text-slate-700">
                  Brief Description of Issue
                  <textarea rows={4} placeholder="Describe your legal matter" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400" />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  Case Type
                  <select className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400">
                    <option>Online Consultation</option>
                    <option>In-Person Visit</option>
                  </select>
                </label>
                <button type="submit" className="w-full rounded-full bg-amber-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-amber-600">
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
      <section className="bg-emerald-50 px-6 py-14 text-slate-900 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-emerald-200 bg-white p-10 shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Confirmation</p>
              <h2 className="mt-4 text-3xl font-semibold">We'll contact you within 24 hours.</h2>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20">
              ✔️ Success
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-600">Check your email for confirmation and a follow-up from our legal team. We are committed to handling your case with professionalism and care.</p>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
