import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaseProgressTracker } from '../../../components/CaseProgressTracker'
import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { WhatsAppCta } from '../../../components/WhatsAppCta'
import { lawyers } from '../../../lib/data'

export default function LawyerDetailPage(props: any) {
  const { params } = props
  const lawyer = lawyers.find((item) => item.id === params.id)
  if (!lawyer) return notFound()

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-sm uppercase tracking-[0.28em] text-amber-600">Home &gt; Our Lawyers &gt; {lawyer.name}</div>
          <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
            <aside className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <div className="flex h-48 w-full items-center justify-center rounded-[2rem] bg-slate-100 text-5xl font-semibold text-slate-600 placeholder-photo">
                {lawyer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-700">{lawyer.role}</p>
                <h1 className="mt-3 text-3xl font-semibold text-primary">{lawyer.name}</h1>
                <p className="mt-2 text-sm text-slate-500">Bar Council ID: {lawyer.barId}</p>
              </div>
              <div className="space-y-3">
                <Link href="/appointment" className="block rounded-full bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-600">
                  Book with This Lawyer
                </Link>
                <a href="https://wa.me/8801715365380" className="block rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-amber-300">
                  WhatsApp Quick Link
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {lawyer.specialties.map((item) => (
                  <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {item}
                  </span>
                ))}
              </div>
            </aside>

            <section className="space-y-8">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <h2 className="text-2xl font-semibold text-primary">Biography</h2>
                <p className="mt-4 text-slate-600 leading-7">{lawyer.bio} A proven advocate for complex matters and client-focused legal strategy, with deep experience across corporate, civil, and international cases.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                  <h3 className="text-xl font-semibold text-primary">Education & Qualifications</h3>
                  <ul className="mt-4 space-y-3 text-slate-600">
                    <li>LL.B (Hons) & LL.M, Dhaka University</li>
                    <li>Harvard Internet Law program</li>
                    <li>Central Law Training England</li>
                  </ul>
                </div>
                <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                  <h3 className="text-xl font-semibold text-primary">Training & Certifications</h3>
                  <ul className="mt-4 space-y-3 text-slate-600">
                    <li>Kensington University USA</li>
                    <li>Neil Weinrib PC USA</li>
                    <li>Ashley Bean & Co. Solicitors England</li>
                  </ul>
                </div>
              </div>
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <h3 className="text-xl font-semibold text-primary">Areas of Practice</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  {lawyer.specialties.map((area) => (
                    <span key={area} className="rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-700">{area}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-primary">Case Metrics</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{lawyer.casesCount} Cases Handled</span>
                </div>
                <p className="mt-4 text-slate-600">Experienced counsel in immigration, corporate restructuring, and civil defense with a strong track record for case resolution.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {lawyer.reviews.map((review) => (
                  <div key={review.name} className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                    <p className="text-sm uppercase tracking-[0.24em] text-amber-700">Client Review</p>
                    <p className="mt-4 text-lg font-semibold text-primary">{review.name}</p>
                    <p className="mt-3 text-slate-600">“{review.quote}”</p>
                    <p className="mt-4 text-sm text-slate-500">Rating: {review.rating} / 5</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[2rem] border border-amber-300 bg-amber-50 p-10 text-center shadow-xl">
                <h2 className="text-2xl font-semibold text-primary">Book an Appointment with {lawyer.name}</h2>
                <p className="mt-3 text-slate-600">Choose your preferred time and let us arrange a direct consultation.</p>
                <Link href="/appointment" className="mt-6 inline-flex rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                  Book Appointment
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
