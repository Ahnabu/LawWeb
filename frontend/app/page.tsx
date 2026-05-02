import Link from 'next/link'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { WhatsAppCta } from '../components/WhatsAppCta'
import { LawyerCard } from '../components/LawyerCard'
import { SuccessStoryCard } from '../components/SuccessStoryCard'
import { PracticeAreaCard } from '../components/PracticeAreaCard'
import { practiceAreas, lawyers, successStories } from '../lib/data'

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <Navbar />

      <section className="bg-hero-pattern py-24 text-white sm:py-28">
        <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
          <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm uppercase tracking-[0.28em] text-amber-200">
            Established 1997 • Dhaka, Bangladesh
          </span>
          <h1 className="mt-8 text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
            Justice Is Not a Privilege — It&apos;s Your Right
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-200 sm:text-xl">
            Islam & Associates offers award-winning corporate, civil, criminal, and immigration counsel with trusted leadership in Dhaka.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            ন্যায় সংশোধন আপনার অধিকার; ইনশাহ আল্লাহ আমরা সঠিক ও দ্রুত সমাধান দেই।
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/appointment" className="inline-flex rounded-full bg-amber-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600">
              Book an Appointment
            </Link>
            <Link href="https://wa.me/8801715365380" className="inline-flex items-center justify-center rounded-full border border-emerald-400 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition hover:border-emerald-300 hover:bg-white/15">
              WhatsApp Us Now
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-300">
            <span className="h-10 w-10 animate-bounce rounded-full border border-slate-300/40" />
            Scroll to learn more
          </div>
        </div>
      </section>

      <section className="bg-primary px-6 py-10 text-slate-100 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['27+ Years of Practice', '500+ Cases Won', '20+ Practice Areas', '3 Generations of Legal Excellence'].map((item) => (
            <div key={item} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center shadow-lg shadow-slate-950/10">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300">{item.split(' ')[2] === 'Practice' ? 'Practice' : 'Law'}</p>
              <p className="mt-4 text-xl font-semibold text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Practice Areas</p>
            <h2 className="mt-4 text-4xl font-semibold text-primary">Areas of Legal Focus</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Trusted counsel for every stage of your legal matter, from corporate transactions to immigration proceedings.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {practiceAreas.map((area) => (
              <PracticeAreaCard key={area.title} title={area.title} description={area.description} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/practice-areas" className="text-sm font-semibold text-amber-700 transition hover:text-amber-900">
              See All Practice Areas →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Meet Our Legal Team</p>
            <h2 className="mt-4 text-4xl font-semibold text-primary">Our Lawyers</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {lawyers.map((lawyer) => (
              <LawyerCard key={lawyer.id} {...lawyer} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/lawyers" className="inline-flex rounded-full border border-amber-500 bg-white px-6 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
              View All Lawyers →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Our Victories</p>
            <h2 className="mt-4 text-4xl font-semibold text-primary">Our Victories, Your Confidence</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {successStories.map((story) => (
              <SuccessStoryCard key={story.title} {...story} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300">Why Choose Us</p>
          <h2 className="mt-4 text-4xl font-semibold">Trusted Law Firm Experience</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Trained Internationally', detail: 'Harvard, Central Law Training England' },
              { title: '27+ Years Experience', detail: 'Established 1997, Dhaka Law Leaders' },
              { title: 'Honest & Transparent', detail: 'No hidden fees, clear communication' },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-left">
                <p className="text-2xl font-semibold text-white">{item.title}</p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-6 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 lg:flex-row">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-amber-200">Need Legal Help?</p>
            <h2 className="mt-3 text-3xl font-semibold">Book a Free Consultation Today.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/appointment" className="rounded-full bg-amber-500 px-8 py-4 text-sm font-semibold text-white transition hover:bg-amber-600">
              Book Appointment
            </Link>
            <Link href="https://wa.me/8801715365380" className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/20">
              Chat on WhatsApp
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
