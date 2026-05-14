"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { CaseProgressTracker } from "../../../../components/CaseProgressTracker";
import { API_BASE_URL } from "../../../../lib/api";

type CaseStatus =
  | "active"
  | "filed"
  | "hearing-scheduled"
  | "under-review"
  | "closed"
  | "won"
  | "lost"
  | "settled"
  | "appealed";

interface TrackedCase {
  _id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: CaseStatus;
  priority: "high" | "medium" | "low";
  description: string;
  lawyerId?: { name?: string; email?: string };
  courtName?: string;
  jurisdiction?: string;
  opposingParty?: string;
  nextCourtDate?: string;
  filingDate?: string;
  notes?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  active: "bg-blue-500/15 text-blue-600",
  filed: "bg-secondary/15 text-secondary",
  "hearing-scheduled": "bg-purple-500/15 text-purple-600",
  "under-review": "bg-yellow-500/15 text-yellow-600",
  closed: "bg-surface-container text-on-surface-variant",
  won: "bg-success/15 text-success",
  lost: "bg-error/15 text-error",
  settled: "bg-teal-500/15 text-teal-600",
  appealed: "bg-orange-500/15 text-orange-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-error/15 text-error",
  medium: "bg-secondary/15 text-secondary",
  low: "bg-success/15 text-success",
};

export default function TrackCasePage() {
  const [cases, setCases] = useState<TrackedCase[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<TrackedCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/cases/my-cases`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch cases");
        const data = await response.json();
        setCases(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedCase(data.data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cases");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  const filteredCases = cases.filter(
    (c) =>
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 p-4 text-sm text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Track Your Case
        </h3>
        <p className="text-sm text-on-surface-variant">
          Monitor the progress and status of your legal matters.
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by Case ID or Title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5 pl-10 text-sm text-on-surface placeholder-on-surface-variant outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary/30"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          {cases.length === 0
            ? "No cases found. Contact your lawyer to start a case."
            : "No cases match your search."}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cases List */}
          <div className="space-y-3 lg:col-span-1">
            {filteredCases.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedCase(c)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedCase?._id === c._id
                    ? "border-secondary bg-secondary/10"
                    : "border-outline-variant bg-surface-container hover:border-secondary/50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {c.caseNumber}
                </p>
                <p className="mt-1 truncate font-semibold text-on-surface">
                  {c.title}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[c.status]}`}
                  >
                    {c.status.replace(/-/g, " ")}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Case Details */}
          {selectedCase && (
            <div className="space-y-4 lg:col-span-2">
              {/* Header */}
              <div className="rounded-lg border border-outline-variant bg-surface-container p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                        Case Details
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold text-on-surface">
                        {selectedCase.title}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[selectedCase.status]}`}
                      >
                        {selectedCase.status.replace(/-/g, " ")}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_COLORS[selectedCase.priority]}`}
                      >
                        {selectedCase.priority.charAt(0).toUpperCase() +
                          selectedCase.priority.slice(1)}{" "}
                        Priority
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-on-surface-variant">Case Number</p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedCase.caseNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Case Type</p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedCase.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Assigned Lawyer</p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedCase.lawyerId?.name || "Pending Assignment"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Next Hearing</p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {selectedCase.nextCourtDate || "Not scheduled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div className="rounded-lg border border-outline-variant bg-surface-container p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Description
                  </p>
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                    {selectedCase.description}
                  </p>
                </div>
              )}

              {/* More Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedCase.courtName && (
                  <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs text-on-surface-variant">Court Name</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {selectedCase.courtName}
                    </p>
                  </div>
                )}
                {selectedCase.jurisdiction && (
                  <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs text-on-surface-variant">Jurisdiction</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {selectedCase.jurisdiction}
                    </p>
                  </div>
                )}
                {selectedCase.opposingParty && (
                  <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs text-on-surface-variant">Opposing Party</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {selectedCase.opposingParty}
                    </p>
                  </div>
                )}
                {selectedCase.filingDate && (
                  <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs text-on-surface-variant">Filed Date</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {new Date(selectedCase.filingDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedCase.notes && (
                <div className="rounded-lg border border-outline-variant bg-surface-container p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Lawyer Notes
                  </p>
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                    {selectedCase.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
