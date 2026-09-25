import { Suspense } from 'react'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { AppointmentWidget } from '../../components/AppointmentWidget'
import { AppointmentBookingForm } from '../../components/AppointmentBookingForm'

export default function AppointmentPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row">
          <div className="space-y-6 flex-1">
            <div className="card-elevated p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Book a Consultation</p>
              <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">Book a Consultation</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
                Choose from an appointment form or start a direct conversation on WhatsApp with our legal team.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card-elevated p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Fill the Appointment Form</p>
                <p className="mt-4 text-on-surface-variant">Pick a lawyer and an open time slot, then describe your matter. Your lawyer confirms the booking.</p>
              </div>
              <div className="card-elevated p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">WhatsApp Us Directly</p>
                <p className="mt-4 text-on-surface-variant">Send a quick message to our legal support team with your preferred language.</p>
              </div>
            </div>
            <Suspense fallback={<div className="card-elevated p-10 text-sm text-on-surface-variant">Loading booking form...</div>}>
              <AppointmentBookingForm />
            </Suspense>
          </div>
          <div className="lg:w-[360px]">
            <AppointmentWidget />
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
