"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Search } from "lucide-react";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { useLanguage } from "../../components/LanguageProvider";
import { listCareerDepartments, listPublicCareers, type CareerOpening } from "../../lib/careers";
import { richTextToPlain } from "../../lib/richText";

const PAGE_SIZE = 12;

export default function CareersPage() {
  const { t, locale, localePath } = useLanguage();
  const [openings, setOpenings] = useState<CareerOpening[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [department, setDepartment] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Ignores responses that arrive after the filters changed again
  const requestId = useRef(0);

  useEffect(() => {
    listCareerDepartments()
      .then(setDepartments)
      .catch(() => {});
  }, []);

  // Debounce the search box so typing does not fire a request per keystroke
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput, search]);

  useEffect(() => {
    const id = ++requestId.current;
    setIsLoading(true);
    setHasError(false);
    listPublicCareers({ search, department, page, limit: PAGE_SIZE })
      .then((result) => {
        if (id !== requestId.current) return;
        setOpenings(result.data);
        setTotal(result.meta?.total ?? result.data.length);
      })
      .catch(() => {
        if (id === requestId.current) setHasError(true);
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [search, department, page]);

  const fmtDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t("careersPage.label")}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t("careersPage.title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">{t("careersPage.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Search and department filter */}
        <div className="space-y-4">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">{t("careersPage.searchPlaceholder")}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("careersPage.searchPlaceholder")}
              className="field pl-9"
            />
          </label>
          {departments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={department === "all"}
                onClick={() => {
                  setDepartment("all");
                  setPage(1);
                }}
                className="chip"
              >
                {t("careersPage.allDepartments")}
              </button>
              {departments.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={department === name}
                  onClick={() => {
                    setDepartment(name);
                    setPage(1);
                  }}
                  className="chip"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card h-52 animate-pulse bg-surface-container" />
            ))}
          </div>
        ) : hasError ? (
          <div className="notice notice-error text-center">{t("careersPage.loadError")}</div>
        ) : openings.length === 0 ? (
          <div className="py-16 text-center">
            <BriefcaseBusiness aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-outline" />
            <p className="text-on-surface-variant">{t("careersPage.noOpenings")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant">
              {total} {t(total === 1 ? "careersPage.opening" : "careersPage.openings")}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {openings.map((opening) => (
                <article key={opening._id} className="card card-interactive flex flex-col p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">
                      {t(`careersPage.employmentTypes.${opening.employmentType}`)}
                    </span>
                    <span className="chip">
                      {t(`careersPage.workplaceTypes.${opening.workplaceType}`)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold leading-snug text-heading">{opening.title}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{opening.department}</p>

                  <dl className="mt-4 space-y-1 text-sm text-on-surface-variant">
                    {opening.location && (
                      <div className="flex gap-2">
                        <dt className="shrink-0">{t("careersPage.location")}</dt>
                        <dd>{opening.location}</dd>
                      </div>
                    )}
                    {opening.experience && (
                      <div className="flex gap-2">
                        <dt className="shrink-0">{t("careersPage.experience")}</dt>
                        <dd>{opening.experience}</dd>
                      </div>
                    )}
                    {opening.salary && (
                      <div className="flex gap-2">
                        <dt className="shrink-0">{t("careersPage.salary")}</dt>
                        <dd>{opening.salary}</dd>
                      </div>
                    )}
                    {opening.deadline && (
                      <div className="flex gap-2">
                        <dt className="shrink-0">{t("careersPage.deadline")}</dt>
                        <dd>{fmtDate(opening.deadline)}</dd>
                      </div>
                    )}
                  </dl>

                  <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-on-surface-variant">
                    {richTextToPlain(opening.description, 180)}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
                    {opening.publishedAt ? (
                      <p className="text-xs text-on-surface-variant">
                        {t("careersPage.publishedOn")} {fmtDate(opening.publishedAt)}
                      </p>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={localePath(`/careers/${opening.slug}`)}
                      className="text-link inline-flex min-h-8 items-center gap-1 text-sm"
                    >
                      {t("careersPage.viewDetails")} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}
