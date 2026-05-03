import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { PracticeAreaCard } from '../../components/PracticeAreaCard'
import { practiceAreaDetails } from '../../lib/data'

export default function PracticeAreasPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="bg-surface px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Practice Areas</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-on-surface">All Areas of Practice</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
            Explore our comprehensive legal services across immigration, criminal, civil and corporate law.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-6xl grid gap-6 xl:grid-cols-2">
          {practiceAreaDetails.slice(0, 4).map((area) => (
            <PracticeAreaCard key={area.title} title={area.title} description={area.details} />
          ))}
        </div>
      </section>
      <section className="bg-surface-container px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold text-on-surface">All Practice Areas</h2>
          <div className="mt-10 space-y-4">
            {practiceAreaDetails.map((area) => (
              <details key={area.title} className="card-elevated p-6">
                <summary className="cursor-pointer text-lg font-semibold text-on-surface">{area.title}</summary>
                <p className="mt-4 text-on-surface-variant">{area.details}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  )
}
