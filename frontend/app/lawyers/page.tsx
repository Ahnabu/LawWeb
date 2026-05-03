import Link from 'next/link'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { LawyerCard } from '../../components/LawyerCard'
import { lawyers } from '../../lib/data'

const filters = ['All', 'Immigration', 'Corporate', 'Civil', 'Criminal', 'Family']

export default function LawyersPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Our Legal Team</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">Our Legal Team</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
            Search talented lawyers by name or specialty and find an experienced advocate for your case.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-6xl card-elevated flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <input type="search" placeholder="Search by name or specialty" className="w-full sm:w-96" />
            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <button key={filter} type="button" className="rounded-md border border-outline-variant bg-surface-container px-4 py-2 text-sm text-on-surface-variant transition hover:border-gold hover:text-gold">
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <Link href="/appointment" className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-gold/90">
            Book a Consultation
          </Link>
        </div>

        <div className="mx-auto mt-12 max-w-6xl grid gap-6 lg:grid-cols-3">
          {lawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} {...lawyer} />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center">
          <button type="button" className="rounded-md border border-gold bg-surface px-6 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
            Load More Lawyers
          </button>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
