import { MessageSquare } from 'lucide-react'

export function AppointmentWidget() {
  return (
    <aside className="card-elevated p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Quick Booking</p>
      <h2 className="mt-3 sm:mt-4 font-display text-lg sm:text-2xl font-semibold text-on-surface">Book a Consultation</h2>
      <p className="mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-on-surface-variant">Submit your case details and receive a fast callback from our legal team.</p>
      <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
        <div className="rounded-lg sm:rounded-xl bg-surface-container p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-on-surface-variant">Preferred Service</p>
          <p className="mt-1 text-sm sm:text-base font-semibold text-on-surface">In-Person or Online</p>
        </div>
        <div className="rounded-lg sm:rounded-xl bg-surface-container p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-on-surface-variant">Fast Response</p>
          <p className="mt-1 text-sm sm:text-base font-semibold text-on-surface">Within 24 hours</p>
        </div>
      </div>
      <a href="https://wa.me/8801715365380" className="mt-4 sm:mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-whatsapp px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-whatsapp/90">
        <MessageSquare className="h-4 w-4" /> Message Us on WhatsApp
      </a>
    </aside>
  )
}
