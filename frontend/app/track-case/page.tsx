"use client";

import Link from "next/link";
import { useState } from "react";
import { CaseProgressTracker } from "../../components/CaseProgressTracker";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { API_BASE_URL } from "../../lib/api";

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
  lawyerId?: { name: string; barId?: string };
  createdAt: string;
  updatedAt: string;
}

export default function TrackCasePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TrackedCase | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/track/${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error(data.message || "Failed to fetch case");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTrack();
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" });

  const currentStep = result ? (STATUS_STEP[result.stage || result.status] ?? 1) : 0;

  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <section className="px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl card-elevated p-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Track Your Case</p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-on-surface">Track Your Case</h1>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Enter your Case ID (e.g. CAS-2025-001) or the email address used when filing to view the latest status.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Case ID or Email Address"
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant focus:border-secondary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleTrack}
              disabled={loading || !query.trim()}
              className="rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Track Now"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-error">{error}</p>
          )}

          {notFound && (
            <div className="mt-10 rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
              No case found with that Case ID or email. Please check your details or{" "}
              <Link href="/#contact" className="text-secondary underline">contact us directly</Link>.
            </div>
          )}

          {result && (
            <div className="mt-10 rounded-xl border border-outline-variant bg-surface-container p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Case Status</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold text-on-surface">{result.caseNumber}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{result.title}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary capitalize">
                    {result.status.replace(/-/g, " ")}
                  </span>
                  {result.stage && result.stage !== result.status && (
                    <span className="rounded-full border border-outline-variant px-3 py-1 text-xs text-on-surface-variant capitalize">
                      Stage: {result.stage.replace(/-/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl bg-surface p-6 space-y-4">
                  <div>
                    <p className="text-xs text-on-surface-variant">Case Type</p>
                    <p className="mt-1 font-semibold text-on-surface capitalize">{result.type.replace(/-/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Assigned Lawyer</p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {result.lawyerId?.name || "Pending Assignment"}
                      {result.lawyerId?.barId && (
                        <span className="ml-1 text-xs font-normal text-on-surface-variant">({result.lawyerId.barId})</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-surface p-6 space-y-4">
                  {result.courtName && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Court</p>
                      <p className="mt-1 font-semibold text-on-surface">{result.courtName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-on-surface-variant">Next Hearing</p>
                    <p className="mt-1 font-semibold text-secondary">
                      {result.nextCourtDate ? fmt(result.nextCourtDate) : "Not yet scheduled"}
                    </p>
                  </div>
                  {result.filingDate && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Filing Date</p>
                      <p className="mt-1 font-semibold text-on-surface">{fmt(result.filingDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10">
                <CaseProgressTracker currentStep={currentStep} />
              </div>

              {result.notes && (
                <div className="mt-8 rounded-xl bg-surface p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Lawyer Notes</p>
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">{result.notes}</p>
                </div>
              )}

              <p className="mt-6 text-center text-xs text-on-surface-variant">
                Last updated: {fmt(result.updatedAt)}
              </p>
            </div>
          )}

          {!result && !notFound && !loading && !error && (
            <div className="mt-10 rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
              Enter your Case ID or email above to check your case status.
            </div>
          )}
        </div>
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}
