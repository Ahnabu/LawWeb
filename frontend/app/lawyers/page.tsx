import Link from 'next/link'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { LawyerCard } from '../../components/LawyerCard'
import { lawyers } from '../../lib/data'

const filters = ['All', 'Immigration', 'Corporate', 'Civil', 'Criminal', 'Family']

export default function LawyersPage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Our Legal Team</p>
          <h1 className="mt-4 text-5xl font-semibold text-primary">Our Legal Team</h1>
          <p className="mt-4 mx-auto max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Search talented lawyers by name or specialty and find an experienced advocate for your case.
          </p>
        </div>
        <div className="mt-12 flex flex-col gap-4 rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <input type="search" placeholder="Search by name or specialty" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 sm:w-96" />
            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <button key={filter} type="button" className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:border-amber-400">
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <Link href="/appointment" className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
            Book a Consultation
          </Link>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {lawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} {...lawyer} />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center">
          <button type="button" className="rounded-full border border-amber-500 bg-white px-6 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
            Load More Lawyers
          </button>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
