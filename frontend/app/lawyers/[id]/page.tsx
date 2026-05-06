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
      <main className="min-h-screen bg-surface text-on-surface theme-transition">
        <Navbar />
        <section className="px-6 py-16 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl rounded-[2rem] card-elevated p-10 text-center shadow-xl">
            <h1 className="text-3xl font-semibold text-heading">Lawyer not found</h1>
            <p className="mt-4 text-on-surface-variant">The lawyer you are looking for does not exist.</p>
            <Link href="/lawyers" className="mt-6 inline-flex rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary transition hover-bg-secondary hover-text-primary">
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
    <main className="min-h-screen bg-surface text-on-surface theme-transition">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-sm uppercase tracking-[0.28em] text-secondary">{t('common.lawyerDetails.breadcrumb')} {lawyer.name}</div>
          <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
            <aside className="space-y-6 rounded-[2rem] card-elevated p-8 shadow-xl">
              <div className="flex h-48 w-full items-center justify-center rounded-[2rem] placeholder-photo bg-surface-container text-on-surface-variant text-5xl font-semibold">
                {lawyer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-secondary">{t(lawyer.roleKey)}</p>
                <h1 className="mt-3 text-responsive-lg font-display font-semibold text-heading">{lawyer.name}</h1>
                <p className="mt-2 text-responsive text-on-surface">{t('common.barCouncilId')}: {lawyer.barId}</p>
              </div>
              <div className="space-y-3">
                <Link href="/dashboard/client/appointment" className="block rounded-full bg-secondary px-4 py-3 text-center text-sm font-semibold text-on-secondary transition hover-bg-secondary hover-text-primary">
                  {t('common.lawyerDetails.bookWithThisLawyer')}
                </Link>
                <a href="https://wa.me/8801715365380" className="block rounded-full border border-outline-variant bg-surface-container px-4 py-3 text-center text-sm font-semibold text-on-surface transition hover-border-secondary">
                  {t('common.lawyerDetails.whatsappQuickLink')}
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {lawyer.specialties.map((item) => (
                  <span key={item} className="rounded-full border border-secondary-25 bg-secondary-10 px-3 py-1 text-xs font-medium text-secondary">
                    {t(item)}
                  </span>
                ))}
              </div>
            </aside>

            <section className="space-y-8">
              <div className="rounded-[2rem] card-elevated p-8 shadow-xl">
                <h2 className="text-responsive-lg font-display font-semibold text-heading">{t('common.lawyerDetails.biography')}</h2>
                <p className="mt-4 text-responsive text-on-surface-variant leading-7">{t(lawyer.bioKey)}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] card-elevated p-8 shadow-xl">
                  <h3 className="text-responsive font-display font-semibold text-heading">{t('common.lawyerDetails.education')}</h3>
                  <ul className="mt-4 space-y-3 text-responsive text-on-surface-variant">
                    <li>LL.B (Hons) & LL.M, Dhaka University</li>
                    <li>Harvard Internet Law program</li>
                    <li>Central Law Training England</li>
                  </ul>
                </div>
                <div className="rounded-[2rem] card-elevated p-8 shadow-xl">
                  <h3 className="text-responsive font-display font-semibold text-heading">{t('common.lawyerDetails.training')}</h3>
                  <ul className="mt-4 space-y-3 text-responsive text-on-surface-variant">
                    <li>Kensington University USA</li>
                    <li>Neil Weinrib PC USA</li>
                    <li>Ashley Bean & Co. Solicitors England</li>
                  </ul>
                </div>
              </div>
              <div className="rounded-[2rem] card-elevated p-8 shadow-xl">
                <h3 className="text-responsive font-display font-semibold text-heading">{t('common.lawyerDetails.areasOfPractice')}</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  {lawyer.specialties.map((area) => (
                    <span key={area} className="rounded-full bg-surface-container px-3 py-2 text-sm text-on-surface">{t(area)}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] card-elevated p-8 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-responsive font-display font-semibold text-heading">{t('common.lawyerDetails.caseMetrics')}</h3>
                  <span className="rounded-full bg-surface-container px-3 py-1 text-sm font-semibold text-on-surface">{lawyer.casesCount} {t('common.lawyerDetails.casesHandled')}</span>
                </div>
                <p className="mt-4 text-on-surface-variant">{t('common.lawyerDetails.experiencedCounsel')}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {lawyer.reviews.map((review) => (
                  <div key={review.name} className="rounded-[2rem] card-elevated p-8 shadow-xl">
                    <p className="text-sm uppercase tracking-[0.24em] text-secondary">{t('common.lawyerDetails.clientReview')}</p>
                    <p className="mt-4 text-responsive-lg font-semibold text-heading">{review.name}</p>
                    <p className="mt-3 text-responsive text-on-surface-variant">“{review.quote}”</p>
                    <p className="mt-4 text-responsive text-on-surface">Rating: {review.rating} / 5</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[2rem] cta-variant bg-primary p-10 text-center shadow-xl">
                <h2 className="text-2xl font-semibold text-heading">{t('common.lawyerDetails.bookAppointmentWith')} {lawyer.name}</h2>
                <p className="mt-3 text-on-surface-variant">{t('common.lawyerDetails.choosePreferredTime')}</p>
                <Link href="/dashboard/client/appointment" className="mt-6 inline-flex rounded-full bg-secondary px-8 py-3 text-sm font-semibold text-on-secondary transition hover-bg-secondary hover-text-primary">
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
