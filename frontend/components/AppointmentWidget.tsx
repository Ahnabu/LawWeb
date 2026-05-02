import { MessageSquare } from 'lucide-react'

export function AppointmentWidget() {
  return (
    <aside className="card-surface rounded-[2rem] border border-slate-200/80 p-6 shadow-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Quick Booking</p>
      <h2 className="mt-4 text-2xl font-semibold text-primary">Book a Consultation</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Submit your case details and receive a fast callback from our legal team.</p>
      <div className="mt-6 space-y-4">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Preferred Service</p>
          <p className="mt-1 font-semibold text-slate-900">In-Person or Online</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Fast Response</p>
          <p className="mt-1 font-semibold text-slate-900">Within 24 hours</p>
        </div>
      </div>
      <a href="https://wa.me/8801715365380" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
        <MessageSquare className="h-4 w-4" /> Message Us on WhatsApp
      </a>
    </aside>
  )
}
