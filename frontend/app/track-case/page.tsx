"use client";

import Link from "next/link";
import { useState } from "react";
import { CaseProgressTracker } from "../../components/CaseProgressTracker";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { useLanguage } from "../../components/LanguageProvider";
import { API_BASE_URL } from "../../lib/api";
import { RichText } from "../../components/RichText";
import { isRichTextEmpty } from "../../lib/richText";

const STATUS_STEP: Record<string, number> = {
  active: 1,
  filed: 2,
  "pre-filing": 2,
  "hearing-scheduled": 3,
  "pre-trial": 3,
  trial: 4,
  "under-review": 4,
  "post-trial": 5,
  "appeal": 5,
  settled: 6,
  won: 6,
  lost: 6,
  closed: 6,
  enforcement: 6,
};

interface TrackedCase {
  caseNumber: string;
  title: string;
  type: string;
  status: string;
  stage?: string;
  priority: string;
  courtName?: string;
  jurisdiction?: string;
  nextCourtDate?: string;
  filingDate?: string;
  notes?: string;
  // null when the lawyer's account was deleted; only their name survives in formerLawyer
  lawyerId?: { name: string; barId?: string } | null;
  formerLawyer?: { name?: string } | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TrackCasePage() {
  const { t, locale, localePath } = useLanguage();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<TrackedCase | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    const q = query.trim();
    const mail = email.trim();
    if (!q || !mail) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError(null);
    try {
      const params = new URLSearchParams({ caseNumber: q, email: mail });
      const res = await fetch(`${API_BASE_URL}/api/cases/track?${params}`);
      const data = await res.json();
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error(data.message || t("trackCase.fetchError"));
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trackCase.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTrack();
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-BD", { day: "numeric", month: "long", year: "numeric" });

  const currentStep = result ? (STATUS_STEP[result.stage || result.status] ?? 1) : 0;

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-secondary">{t("trackCase.label")}</p>
          <h1 className="mt-3 text-white">{t("trackCase.title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">{t("trackCase.subtitle")}</p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="card p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("trackCase.placeholder")}
                aria-label={t("trackCase.placeholder")}
                className="field"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("trackCase.emailPlaceholder")}
                aria-label={t("trackCase.emailPlaceholder")}
                autoComplete="email"
                className="field"
              />
              <button
                type="button"
                onClick={handleTrack}
                disabled={loading || !query.trim() || !email.trim()}
                className="btn btn-primary"
              >
                {loading ? t("trackCase.searching") : t("trackCase.trackNow")}
              </button>
            </div>

            {error && (
              <p className="notice notice-error mt-4" role="alert">
                {error}
              </p>
            )}
          </div>

          {notFound && (
            <div className="panel p-6 text-center text-sm leading-6 text-on-surface-variant">
              {t("trackCase.notFound")}{" "}
              <Link href={localePath("/contact")} className="text-link">{t("trackCase.contactUs")}</Link>
            </div>
          )}

          {result && (
            <div className="card p-5 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-on-surface-variant">{t("trackCase.caseStatus")}</p>
                  <h2 className="mt-1 break-words text-2xl text-heading">{result.caseNumber}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{result.title}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.isArchived && <span className="chip">{t("trackCase.archived")}</span>}
                  <span className="chip capitalize text-on-surface">{result.status.replace(/-/g, " ")}</span>
                  {result.stage && result.stage !== result.status && (
                    <span className="chip capitalize">
                      {t("trackCase.stage")}: {result.stage.replace(/-/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              {result.isArchived && (
                <div className="notice mt-6 text-on-surface-variant">
                  {result.archivedAt && (
                    <p className="mb-1 text-xs font-semibold text-on-surface">
                      {t("trackCase.archivedOn")}: {fmt(result.archivedAt)}
                    </p>
                  )}
                  {t("trackCase.archivedNotice")}{" "}
                  <Link href={localePath("/contact")} className="text-link">{t("trackCase.contactUs")}</Link>
                </div>
              )}

              <div className="mt-8">
                <CaseProgressTracker currentStep={currentStep} />
              </div>

              <dl className="panel mt-8 grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-on-surface-variant">{t("trackCase.caseType")}</dt>
                  <dd className="mt-0.5 font-semibold capitalize text-on-surface">{result.type.replace(/-/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">{t("trackCase.assignedLawyer")}</dt>
                  <dd className="mt-0.5 font-semibold text-on-surface">
                    {result.lawyerId?.name ||
                      (result.formerLawyer?.name
                        ? `${result.formerLawyer.name} ${t("trackCase.formerLawyer")}`
                        : result.isArchived
                          ? "—"
                          : t("trackCase.pendingAssignment"))}
                    {result.lawyerId?.barId && (
                      <span className="ml-1 text-xs font-normal text-on-surface-variant">({result.lawyerId.barId})</span>
                    )}
                  </dd>
                </div>
                {result.courtName && (
                  <div>
                    <dt className="text-on-surface-variant">{t("trackCase.court")}</dt>
                    <dd className="mt-0.5 font-semibold text-on-surface">{result.courtName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-on-surface-variant">{t("trackCase.nextHearing")}</dt>
                  <dd className="mt-0.5 font-semibold text-gold-ink">
                    {result.nextCourtDate ? fmt(result.nextCourtDate) : t("trackCase.notScheduled")}
                  </dd>
                </div>
                {result.filingDate && (
                  <div>
                    <dt className="text-on-surface-variant">{t("trackCase.filingDate")}</dt>
                    <dd className="mt-0.5 font-semibold text-on-surface">{fmt(result.filingDate)}</dd>
                  </div>
                )}
              </dl>

              {!isRichTextEmpty(result.notes) && (
                <div className="mt-6">
                  <h3 className="font-body text-sm font-semibold text-on-surface">{t("trackCase.lawyerNotes")}</h3>
                  <div className="mt-2 max-w-prose">
                    <RichText value={result.notes} />
                  </div>
                </div>
              )}

              <hr className="rule mt-8" />
              <p className="mt-4 text-xs text-on-surface-variant">
                {t("trackCase.lastUpdated")}: {fmt(result.updatedAt)}
              </p>
            </div>
          )}

          {!result && !notFound && !loading && !error && (
            <p className="text-center text-sm leading-6 text-on-surface-variant">{t("trackCase.emptyHint")}</p>
          )}
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}
