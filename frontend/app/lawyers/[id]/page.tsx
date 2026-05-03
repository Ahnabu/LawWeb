'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CaseProgressTracker } from '../../../components/CaseProgressTracker'
import { Footer } from '../../../components/Footer'
import { Navbar } from '../../../components/Navbar'
import { WhatsAppCta } from '../../../components/WhatsAppCta'
import { useLanguage } from '../../../components/LanguageProvider'
import { lawyers } from '../../../lib/data'

export default function LawyerDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const lawyer = lawyers.find((item) => item.id === params?.id)
  if (!lawyer) {
    return (
      <main className="min-h-screen bg-background text-slate-900">
        <Navbar />
        <section className="px-6 py-16 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200/80 bg-white p-10 text-center shadow-xl">
            <h1 className="text-3xl font-semibold text-primary">Lawyer not found</h1>
            <p className="mt-4 text-slate-600">The lawyer you are looking for does not exist.</p>
            <Link href="/lawyers" className="mt-6 inline-flex rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
              Back to lawyers
            </Link>
          </div>
        </section>
        <Footer />
        <WhatsAppCta />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-slate-900">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-sm uppercase tracking-[0.28em] text-amber-600">{t('common.lawyerDetails.breadcrumb')} {lawyer.name}</div>
          <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
            <aside className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
              <div className="flex h-48 w-full items-center justify-center rounded-[2rem] bg-slate-100 text-5xl font-semibold text-slate-600 placeholder-photo">
                {lawyer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-amber-700">{t(lawyer.roleKey)}</p>
                <h1 className="mt-3 text-3xl font-semibold text-primary">{lawyer.name}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('common.barCouncilId')}: {lawyer.barId}</p>
              </div>
              <div className="space-y-3">
                <Link href="/appointment" className="block rounded-full bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-600">
                  {t('common.lawyerDetails.bookWithThisLawyer')}
                </Link>
                <a href="https://wa.me/8801715365380" className="block rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-amber-300">
                  {t('common.lawyerDetails.whatsappQuickLink')}
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {lawyer.specialties.map((item) => (
                  <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {t(item)}
                  </span>
                ))}
              </div>
            </aside>

            <section className="space-y-8">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <h2 className="text-2xl font-semibold text-primary">{t('common.lawyerDetails.biography')}</h2>
                <p className="mt-4 text-slate-600 leading-7">{t(lawyer.bioKey)}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                  <h3 className="text-xl font-semibold text-primary">{t('common.lawyerDetails.education')}</h3>
                  <ul className="mt-4 space-y-3 text-slate-600">
                    <li>LL.B (Hons) & LL.M, Dhaka University</li>
                    <li>Harvard Internet Law program</li>
                    <li>Central Law Training England</li>
                  </ul>
                </div>
                <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                  <h3 className="text-xl font-semibold text-primary">{t('common.lawyerDetails.training')}</h3>
                  <ul className="mt-4 space-y-3 text-slate-600">
                    <li>Kensington University USA</li>
                    <li>Neil Weinrib PC USA</li>
                    <li>Ashley Bean & Co. Solicitors England</li>
                  </ul>
                </div>
              </div>
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <h3 className="text-xl font-semibold text-primary">{t('common.lawyerDetails.areasOfPractice')}</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  {lawyer.specialties.map((area) => (
                    <span key={area} className="rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-700">{t(area)}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-primary">{t('common.lawyerDetails.caseMetrics')}</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{lawyer.casesCount} {t('common.lawyerDetails.casesHandled')}</span>
                </div>
                <p className="mt-4 text-slate-600">{t('common.lawyerDetails.experiencedCounsel')}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {lawyer.reviews.map((review) => (
                  <div key={review.name} className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-xl">
                    <p className="text-sm uppercase tracking-[0.24em] text-amber-700">{t('common.lawyerDetails.clientReview')}</p>
                    <p className="mt-4 text-lg font-semibold text-primary">{review.name}</p>
                    <p className="mt-3 text-slate-600">“{review.quote}”</p>
                    <p className="mt-4 text-sm text-slate-500">Rating: {review.rating} / 5</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[2rem] border border-amber-300 bg-amber-50 p-10 text-center shadow-xl">
                <h2 className="text-2xl font-semibold text-primary">{t('common.lawyerDetails.bookAppointmentWith')} {lawyer.name}</h2>
                <p className="mt-3 text-slate-600">{t('common.lawyerDetails.choosePreferredTime')}</p>
                <Link href="/appointment" className="mt-6 inline-flex rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                  {t('common.lawyerDetails.bookAppointment')}
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
