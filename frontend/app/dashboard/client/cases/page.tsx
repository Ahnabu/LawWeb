"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
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

interface CaseItem {
  _id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: CaseStatus;
  priority: "high" | "medium" | "low";
  description: string;
  lawyerId?: { name?: string; email?: string; barId?: string; phone?: string };
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

const STATUS_FILTERS: { label: string; value: CaseStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Filed", value: "filed" },
  { label: "Hearing", value: "hearing-scheduled" },
  { label: "Won", value: "won" },
  { label: "Closed", value: "closed" },
];

export default function ClientCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filtered, setFiltered] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<CaseStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<CaseItem | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/cases/my-cases`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.data) throw new Error(data.message || "Failed to fetch cases");
        setCases(data.data);
      })
      .catch((err) => toast.error(err.message || "Failed to load cases"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      setFiltered(cases);
    } else {
      setFiltered(cases.filter((c) => c.status === activeTab));
    }
  }, [activeTab, cases]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 animate-pulse rounded bg-surface-container" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-surface-container" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          My Cases
        </h3>
        <p className="text-sm text-on-surface-variant">
          Track the progress of your active legal matters.
        </p>
      </header>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-1">
        {STATUS_FILTERS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          No cases found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-3 py-2.5">Case #</th>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">Lawyer</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Next Hearing</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface">
              {filtered.map((c) => (
                <tr key={c._id} className="transition-colors hover:bg-surface-container">
                  <td className="px-3 py-2.5 font-mono text-xs text-on-surface-variant">
                    {c.caseNumber}
                  </td>
                  <td className="px-3 py-2.5 max-w-40 truncate font-medium text-on-surface">
                    {c.title}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {c.lawyerId?.name || "—"}
                  </td>
                  <td className="px-3 py-2.5 capitalize text-on-surface-variant">
                    {c.type.replace(/-/g, " ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[c.priority] || ""}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[c.status] || ""}`}>
                      {c.status.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-on-surface-variant">
                    {c.nextCourtDate
                      ? new Date(c.nextCourtDate).toLocaleDateString("en-BD", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-on-surface">
                Case Details
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Case #" value={selected.caseNumber} />
              <Row label="Title" value={selected.title} />
              <Row label="Type" value={selected.type.replace(/-/g, " ")} />
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface-variant">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[selected.status] || ""}`}>
                  {selected.status.replace(/-/g, " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface-variant">Priority</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[selected.priority] || ""}`}>
                  {selected.priority}
                </span>
              </div>
              {selected.lawyerId?.name && <Row label="Assigned Lawyer" value={selected.lawyerId.name} />}
              {selected.courtName && <Row label="Court" value={selected.courtName} />}
              {selected.jurisdiction && <Row label="Jurisdiction" value={selected.jurisdiction} />}
              {selected.opposingParty && <Row label="Opposing Party" value={selected.opposingParty} />}
              {selected.filingDate && (
                <Row label="Filing Date" value={new Date(selected.filingDate).toLocaleDateString()} />
              )}
              {selected.nextCourtDate && (
                <Row label="Next Hearing" value={new Date(selected.nextCourtDate).toLocaleDateString()} />
              )}
              <div className="pt-2">
                <p className="font-medium text-on-surface-variant">Description</p>
                <p className="mt-1 text-on-surface">{selected.description}</p>
              </div>
              {selected.notes && (
                <div>
                  <p className="font-medium text-on-surface-variant">Notes</p>
                  <p className="mt-1 text-on-surface">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 font-medium text-on-surface-variant">{label}</span>
      <span className="text-right capitalize text-on-surface">{value}</span>
    </div>
  );
}
