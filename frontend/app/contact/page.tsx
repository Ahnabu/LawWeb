'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Mail, MapPin, Phone, Printer } from 'lucide-react'
import { ContactForm } from '../../components/ContactForm'
import { Footer, socialIcons, socialLabels } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { WhatsAppCta, WhatsAppMark } from '../../components/WhatsAppCta'
import { useLanguage } from '../../components/LanguageProvider'
import { useSiteSettings } from '../../components/contentHooks'

// Contact details come from the CMS "site" settings (useSiteSettings); the
// page's own text is CMS-editable under the "contact" page.

interface ContactMethod {
  key: string
  icon: React.ReactNode
  title: string
  value: string
  href: string
  external?: boolean
}

export default function ContactPage() {
  const { t, localePath } = useLanguage()
  const settings = useSiteSettings()
  const address = t('site.address')

  const methods: ContactMethod[] = [
    {
      key: 'phone',
      icon: <Phone className="h-5 w-5" aria-hidden="true" />,
      title: t('contact.callUs'),
      value: settings.phoneDisplay,
      href: settings.telHref(),
    },
    {
      key: 'whatsapp',
      icon: <WhatsAppMark className="h-5 w-5" />,
      title: t('contact.whatsappLabel'),
      value: t('contact.whatsappAction'),
      href: settings.whatsappHref(t('site.whatsappMessage')),
      external: true,
    },
    ...(settings.email
      ? [
          {
            key: 'email',
            icon: <Mail className="h-5 w-5" aria-hidden="true" />,
            title: t('contact.emailUs'),
            value: settings.email,
            href: `mailto:${settings.email}`,
          },
        ]
      : []),
  ]

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t('contact.label')}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t('contact.title')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
          <div className={`grid gap-4 sm:grid-cols-2 sm:gap-5 ${methods.length > 2 ? 'lg:grid-cols-3' : ''}`}>
            {methods.map((method) => (
              <a
                key={method.key}
                href={method.href}
                {...(method.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="card card-interactive group flex items-start gap-3 p-5 sm:p-6"
              >
                <span className="mt-0.5 shrink-0 text-gold-ink">{method.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-on-surface-variant">{method.title}</span>
                  <span className="mt-1 block wrap-break-word font-semibold text-on-surface underline-offset-4 group-hover:underline">
                    {method.value}
                  </span>
                </span>
              </a>
            ))}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="card p-5 sm:p-8">
              <h2 className="text-2xl text-heading">
                {t('contact.formTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{t('contact.formText')}</p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-5 sm:p-7">
                <h2 className="text-xl text-heading">
                  {t('contact.officeTitle')}
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">{t('site.firmName')}</p>

                <dl className="mt-6 space-y-5 text-sm">
                  {/* <div className="flex gap-4">
                    <dt className="mt-0.5 text-gold-ink">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{t('contact.officeTitle')}</span>
                    </dt>
                    <dd>
                      <p className="leading-6 text-on-surface">{address}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link mt-2 inline-flex items-center gap-1"
                      >
                        {t('contact.directions')}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </dd>
                  </div> */}
                  <div className="flex gap-4">
                    <dt className="mt-0.5 text-gold-ink">
                      <Clock className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{t('contact.hoursTitle')}</span>
                    </dt>
                    <dd>
                      <p className="font-semibold text-on-surface">{t('contact.hoursTitle')}</p>
                      <p className="mt-1 whitespace-pre-line leading-6 text-on-surface-variant">{t('contact.hours')}</p>
                    </dd>
                  </div>
                  {settings.fax && (
                    <div className="flex gap-4">
                      <dt className="mt-0.5 text-gold-ink">
                        <Printer className="h-5 w-5" aria-hidden="true" />
                        <span className="sr-only">{t('site.faxLabel')}</span>
                      </dt>
                      <dd className="text-on-surface">
                        <span className="text-on-surface-variant">{t('site.faxLabel')}:</span> {settings.fax}
                      </dd>
                    </div>
                  )}
                </dl>

                {settings.socials.length > 0 && (
                  <div className="mt-6">
                    <hr className="rule mb-5" />
                    <p className="text-sm font-semibold text-on-surface">
                      {t('site.followUs')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {settings.socials.map((social) => (
                        <a
                          key={`${social.platform}-${social.url}`}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={socialLabels[social.platform]}
                          title={socialLabels[social.platform]}
                          className="btn btn-secondary btn-icon text-on-surface-variant"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            {socialIcons[social.platform]}
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="panel p-5 sm:p-6">
                <h2 className="text-lg text-heading">
                  {t('contact.bookTitle')}
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{t('contact.bookText')}</p>
                <Link
                  href={localePath('/appointment')}
                  className="btn btn-secondary btn-block mt-5"
                >
                  {t('contact.bookCta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppCta />
    </main>
  )
}
