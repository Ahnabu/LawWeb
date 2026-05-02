import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta } from '../../components/WhatsAppCta'
import { PracticeAreaCard } from '../../components/PracticeAreaCard'
import { practiceAreaDetails } from '../../lib/data'

export default function PracticeAreasPage() {
  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Practice Areas</p>
          <h1 className="mt-4 text-5xl font-semibold text-primary">All Areas of Practice</h1>
          <p className="mt-4 mx-auto max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore our comprehensive legal services across immigration, criminal, civil and corporate law.
          </p>
        </div>
        <div className="mt-12 grid gap-6 xl:grid-cols-2">
          {practiceAreaDetails.slice(0, 4).map((area) => (
            <PracticeAreaCard key={area.title} title={area.title} description={area.details} />
          ))}
        </div>
      </section>
      <section className="bg-slate-50 px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-primary">All Practice Areas</h2>
          <div className="mt-10 space-y-4">
            {practiceAreaDetails.map((area) => (
              <details key={area.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
                <summary className="cursor-pointer text-lg font-semibold text-slate-900">{area.title}</summary>
                <p className="mt-4 text-slate-600">{area.details}</p>
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
