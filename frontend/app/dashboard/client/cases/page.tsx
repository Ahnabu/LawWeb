"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "../../../../lib/api";
import { apiFetch } from "../../../../lib/http";
import { ArchivedBadge } from "../../../../components/CaseArchive";
import { caseLawyerName, formatCaseDate } from "../../../../lib/cases";
import { RichText } from "../../../../components/RichText";
import { isRichTextEmpty } from "../../../../lib/richText";

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

interface IPayment {
  _id: string;
  amount: number;
  date: string;
  details?: string;
}

interface CaseItem {
  _id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: CaseStatus;
  priority: "high" | "medium" | "low";
  description: string;
  // null when the lawyer's account was deleted; formerLawyer then holds their name
  lawyerId?: { name?: string; email?: string; barId?: string; phone?: string } | null;
  formerLawyer?: { name: string } | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  courtName?: string;
  jurisdiction?: string;
  opposingParty?: string;
  nextCourtDate?: string;
  filingDate?: string;
  notes?: string;
  totalPayment?: number;
  payments?: IPayment[];
  createdAt: string;
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  active: "bg-blue-500/15 text-blue-600",
  filed: "bg-secondary/15 text-gold-ink",
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
  medium: "bg-secondary/15 text-gold-ink",
  low: "bg-success/15 text-success",
};

type CaseFilter = CaseStatus | "all" | "archived";

const STATUS_FILTERS: { label: string; value: CaseFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Filed", value: "filed" },
  { label: "Hearing", value: "hearing-scheduled" },
  { label: "Won", value: "won" },
  { label: "Closed", value: "closed" },
  { label: "Archived", value: "archived" },
];

export default function ClientCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filtered, setFiltered] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<CaseFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<CaseItem | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/cases/my-cases`, { credentials: "include" })
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
    } else if (activeTab === "archived") {
      setFiltered(cases.filter((c) => c.isArchived));
    } else {
      setFiltered(cases.filter((c) => !c.isArchived && c.status === activeTab));
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

  const stats = {
    total: cases.length,
    // An archived case is no longer being worked on, even if its last status was "active"
    active: cases.filter((c) => !c.isArchived && c.status === "active").length,
    won: cases.filter((c) => c.status === "won").length,
    closed: cases.filter((c) => c.status === "closed").length,
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="font-display text-2xl font-semibold text-heading">
          My Cases
        </h3>
        <p className="text-sm text-on-surface-variant">
          Track the progress of your active legal matters.
        </p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Cases" value={stats.total} />
        <StatsCard label="Active Cases" value={stats.active} />
        <StatsCard label="Won Cases" value={stats.won} />
        <StatsCard label="Closed Cases" value={stats.closed} />
      </div>

      {/* Status filter tabs */}
      <div className="panel flex gap-1 overflow-x-auto p-1">
        {STATUS_FILTERS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.value
                ? "bg-surface-raised font-semibold text-on-surface shadow-[inset_0_1px_0_var(--highlight),0_1px_2px_rgb(16_24_40/0.12)]"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-on-surface-variant">
          No cases found.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container text-left text-xs font-semibold text-on-surface-variant">
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
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((c) => (
                <tr key={c._id} className="transition-colors hover:bg-surface-container">
                  <td className="px-3 py-2.5 font-mono text-xs text-on-surface-variant">
                    {c.caseNumber}
                  </td>
                  <td className="px-3 py-2.5 max-w-40 truncate font-medium text-on-surface">
                    {c.title}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {caseLawyerName(c)}
                  </td>
                  <td className="px-3 py-2.5 capitalize text-on-surface-variant">
                    {c.type.replace(/-/g, " ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[c.priority] || ""}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[c.status] || ""}`}>
                        {c.status.replace(/-/g, " ")}
                      </span>
                      {c.isArchived && <ArchivedBadge />}
                    </div>
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
                      className="btn btn-ghost btn-sm min-h-8 px-2 text-xs"
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.5)] p-4 py-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="card w-full max-w-lg p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-heading">
                Case Details
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="btn btn-ghost btn-icon"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {selected.isArchived && (
                <div className="notice px-3 py-2 text-xs text-on-surface-variant">
                  This case was archived on {formatCaseDate(selected.archivedAt)} and is no longer active.
                  Contact the firm if you have questions about it.
                </div>
              )}
              <Row label="Case #" value={selected.caseNumber} />
              <Row label="Title" value={selected.title} />
              <Row label="Type" value={selected.type.replace(/-/g, " ")} />
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface-variant">Status</span>
                <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[selected.status] || ""}`}>
                  {selected.status.replace(/-/g, " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface-variant">Priority</span>
                <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[selected.priority] || ""}`}>
                  {selected.priority}
                </span>
              </div>
              {selected.lawyerId?.name ? (
                <Row label="Assigned Lawyer" value={selected.lawyerId.name} />
              ) : selected.formerLawyer?.name ? (
                <Row label="Former Lawyer" value={selected.formerLawyer.name} />
              ) : null}
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
                <RichText value={selected.description} tone="strong" className="mt-1" />
              </div>
              {!isRichTextEmpty(selected.notes) && (
                <div>
                  <p className="font-medium text-on-surface-variant">Notes</p>
                  <RichText value={selected.notes} tone="strong" className="mt-1" />
                </div>
              )}

              {/* Financials & Payments */}
              {(selected.totalPayment !== undefined || (selected.payments && selected.payments.length > 0)) && (
                <div className="border-t border-outline-variant/60 pt-3 space-y-3">
                  <h4 className="font-semibold text-on-surface">Payments & Financials</h4>

                  <div className="panel space-y-2 p-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-on-surface-variant">Total Payment</span>
                      <span className="font-semibold text-on-surface">৳{(selected.totalPayment || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-outline-variant/20 pt-2">
                      <span className="font-medium text-on-surface-variant">Total Paid</span>
                      <span className="font-semibold text-success">
                        ৳{(selected.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-on-surface-variant">Remaining Balance</span>
                      <span className={`font-bold ${Math.max(0, (selected.totalPayment || 0) - (selected.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) > 0 ? "text-error" : "text-success"}`}>
                        ৳{Math.max(0, (selected.totalPayment || 0) - (selected.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {selected.payments && selected.payments.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-on-surface-variant">Payment Records</p>
                      <div className="max-h-36 overflow-y-auto rounded border border-outline-variant/40 bg-surface-container-low text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-outline-variant bg-surface-container text-on-surface-variant font-semibold">
                              <th className="px-2.5 py-1">Date</th>
                              <th className="px-2.5 py-1">Details</th>
                              <th className="px-2.5 py-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/25">
                            {selected.payments.map((p) => (
                              <tr key={p._id} className="text-on-surface">
                                <td className="px-2.5 py-1 whitespace-nowrap">
                                  {new Date(p.date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                                </td>
                                <td className="px-2.5 py-1">{p.details || "—"}</td>
                                <td className="px-2.5 py-1 text-right font-medium text-success">
                                  ৳{p.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-heading">
        {value}
      </p>
    </div>
  );
}
