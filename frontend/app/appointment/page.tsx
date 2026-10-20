import { Suspense } from 'react'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { AppointmentWidget } from '../../components/AppointmentWidget'
import { AppointmentBookingForm } from '../../components/AppointmentBookingForm'
import { singleLanguagePageMetadata } from '../../lib/seo'

export const generateMetadata = singleLanguagePageMetadata('appointment')

export default function AppointmentPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-white">Book a Consultation</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
            Choose from an appointment form or start a direct conversation on WhatsApp with our legal team.
          </p>
          <div className="mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="border-t border-white/15 pt-4">
              <h2 className="font-body text-base font-semibold text-white">Fill the Appointment Form</h2>
              <p className="mt-1 text-sm leading-6 text-white/75">
                Pick a lawyer and an open time slot, then describe your matter. Your lawyer confirms the booking.
              </p>
            </div>
            <div className="border-t border-white/15 pt-4">
              <h2 className="font-body text-base font-semibold text-white">WhatsApp Us Directly</h2>
              <p className="mt-1 text-sm leading-6 text-white/75">
                Send a quick message to our legal support team with your preferred language.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
          <Suspense fallback={<div className="card p-8 text-sm text-on-surface-variant">Loading booking form...</div>}>
            <AppointmentBookingForm />
          </Suspense>
          <div className="lg:sticky lg:top-24">
            <AppointmentWidget />
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
