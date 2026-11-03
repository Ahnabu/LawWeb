"use client";

import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Mail } from "lucide-react";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { WhatsAppCta } from "./WhatsAppCta";
import { RichText } from "./RichText";
import { useLanguage } from "./LanguageProvider";
import type { CareerOpening } from "../lib/careers";

// The body of one opening. The page itself is a server component (it does the
// metadata and the 404); this part is client-side because the copy is translated.

export function CareerDetail({ career }: { career: CareerOpening }) {
  const { t, locale, localePath } = useLanguage();

  const fmtDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  const mailtoSubject = encodeURIComponent(`Application: ${career.title}`);
  const mailtoHref = `mailto:${career.applicationEmail}?subject=${mailtoSubject}`;

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href={localePath("/careers")}
            className="inline-flex min-h-8 items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t("careersPage.backToCareers")}
          </Link>
          <h1 className="mt-4 max-w-3xl text-white">{career.title}</h1>
          <p className="mt-3 text-base text-white/80">{career.department}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">{t(`careersPage.employmentTypes.${career.employmentType}`)}</span>
            <span className="chip">{t(`careersPage.workplaceTypes.${career.workplaceType}`)}</span>
            {career.location && <span className="chip">{career.location}</span>}
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <dl className="grid gap-4 sm:grid-cols-2">
          {career.location && (
            <div>
              <dt className="text-sm text-on-surface-variant">{t("careersPage.location")}</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{career.location}</dd>
            </div>
          )}
          {career.experience && (
            <div>
              <dt className="text-sm text-on-surface-variant">{t("careersPage.experience")}</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{career.experience}</dd>
            </div>
          )}
          {career.salary && (
            <div>
              <dt className="text-sm text-on-surface-variant">{t("careersPage.salary")}</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{career.salary}</dd>
            </div>
          )}
          {career.deadline && (
            <div>
              <dt className="text-sm text-on-surface-variant">{t("careersPage.deadline")}</dt>
              <dd className="mt-0.5 font-medium text-on-surface">{fmtDate(career.deadline)}</dd>
            </div>
          )}
        </dl>

        <section>
          <h2 className="font-display text-xl font-semibold text-heading">
            {t("careersPage.aboutTheRole")}
          </h2>
          <RichText className="mt-3" value={career.description} size="base" tone="strong" />
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-heading">
            {t("careersPage.requirementsHeading")}
          </h2>
          <RichText className="mt-3" value={career.requirements} size="base" tone="strong" />
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-heading">
            {t("careersPage.howToApply")}
          </h2>
          {career.applicationInstructions && (
            <RichText className="mt-3" value={career.applicationInstructions} size="base" tone="strong" />
          )}

          <div className="card mt-5 space-y-4 p-5 sm:p-6">
            {career.applicationEmail && (
              <div>
                <p className="text-sm font-semibold text-on-surface">{t("careersPage.applyByEmail")}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{t("careersPage.applicationNote")}</p>
                <a href={mailtoHref} className="btn btn-primary mt-3">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {t("careersPage.sendCv")}
                </a>
                <p className="mt-2 break-all text-sm text-on-surface-variant">{career.applicationEmail}</p>
              </div>
            )}

            {career.applicationUrl && (
              <div>
                <p className="text-sm font-semibold text-on-surface">{t("careersPage.applyOnline")}</p>
                <a
                  href={career.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary mt-3"
                >
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                  {t("careersPage.applyOnline")}
                </a>
              </div>
            )}

            {!career.applicationEmail && !career.applicationUrl && (
              <p className="text-sm text-on-surface-variant">{t("careersPage.applicationNote")}</p>
            )}
          </div>
        </section>

        <div>
          <Link href={localePath("/careers")} className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("careersPage.backToCareers")}
          </Link>
        </div>
      </article>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}
