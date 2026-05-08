"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, StarOff, Plus, Eye, X } from "lucide-react";
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

type CasePriority = "high" | "medium" | "low";

interface CaseItem {
  _id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: CaseStatus;
  priority: CasePriority;
  clientName: string;
  clientEmail: string;
  isFeatured: boolean;
  nextCourtDate?: string;
  courtName?: string;
  jurisdiction?: string;
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

const PRIORITY_COLORS: Record<CasePriority, string> = {
  high: "bg-error/15 text-error",
  medium: "bg-secondary/15 text-secondary",
  low: "bg-success/15 text-success",
};

const CASE_TYPES = [
  "immigration", "criminal", "civil", "corporate", "family",
  "real-estate", "intellectual-property", "banking-finance",
  "labor", "tax", "constitutional", "environmental",
];

const STATUS_FILTERS: { label: string; value: CaseStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Filed", value: "filed" },
  { label: "Hearing", value: "hearing-scheduled" },
  { label: "Won", value: "won" },
  { label: "Closed", value: "closed" },
];

const emptyForm = {
  clientName: "",
  clientEmail: "",
  type: "civil",
  title: "",
  description: "",
  priority: "medium" as CasePriority,
  courtName: "",
  jurisdiction: "",
  opposingParty: "",
  opposingCounsel: "",
  filingDate: "",
  nextCourtDate: "",
  isOnline: true,
};

export default function LawyerCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filtered, setFiltered] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<CaseStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/my-cases`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch cases");
      setCases(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    const sorted = [...cases].sort((a, b) =>
      a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1,
    );
    if (activeTab === "all") {
      setFiltered(sorted);
    } else {
      setFiltered(sorted.filter((c) => c.status === activeTab));
    }
  }, [activeTab, cases]);

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          filingDate: form.filingDate || undefined,
          nextCourtDate: form.nextCourtDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create case");
      setShowAddModal(false);
      setForm(emptyForm);
      await fetchCases();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeatured = async (caseId: string) => {
    setTogglingId(caseId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/cases/${caseId}/toggle-featured`,
        { method: "PATCH", credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCases((prev) =>
        prev.map((c) =>
          c._id === caseId ? { ...c, isFeatured: data.data.isFeatured } : c,
        ),
      );
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 animate-pulse rounded bg-surface-container" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded bg-surface-container"
          />
        ))}
      </div>
    );
  }

  if (error) return <div className="text-error">Error: {error}</div>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            My Cases
          </h3>
          <p className="text-sm text-on-surface-variant">
            Track and manage your assigned legal matters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Case
        </button>
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
          No cases found.{" "}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-primary underline"
          >
            Add your first case.
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-3 py-2.5 w-5" aria-label="Featured" />
                <th className="px-3 py-2.5">Case #</th>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Next Hearing</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface">
              {filtered.map((c) => (
                <tr
                  key={c._id}
                  className={`hover:bg-surface-container-low transition-colors ${c.isFeatured ? "bg-secondary/5" : ""}`}
                >
                  {/* Featured star */}
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-label={c.isFeatured ? "Unfeature case" : "Feature case"}
                      disabled={togglingId === c._id}
                      onClick={() => toggleFeatured(c._id)}
                      className="text-on-surface-variant hover:text-secondary transition-colors disabled:opacity-40"
                    >
                      {c.isFeatured ? (
                        <Star className="h-4 w-4 fill-secondary text-secondary" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-on-surface-variant">
                    {c.caseNumber}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-on-surface max-w-40 truncate">
                    {c.title}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {c.clientName}
                    <div className="text-xs">{c.clientEmail}</div>
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant capitalize">
                    {c.type.replace(/-/g, " ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[c.priority]}`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[c.status]}`}
                    >
                      {c.status.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap text-xs">
                    {c.nextCourtDate
                      ? new Date(c.nextCourtDate).toLocaleDateString("en-BD", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/dashboard/lawyer/cases/${c._id}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Case Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-outline-variant bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-on-surface">
                Add New Case
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCase} className="space-y-4">
              {/* Client info */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Client Information
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Client Name *
                    </label>
                    <input
                      required
                      value={form.clientName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, clientName: e.target.value }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Client Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.clientEmail}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, clientEmail: e.target.value }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Case info */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Case Details
                </legend>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                    Case Title *
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    placeholder="Brief title of the case"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none"
                    placeholder="Describe the nature of the case..."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="case-type" className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Case Type *
                    </label>
                    <select
                      id="case-type"
                      required
                      title="Case Type"
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    >
                      {CASE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="case-priority" className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Priority
                    </label>
                    <select
                      id="case-priority"
                      title="Priority"
                      value={form.priority}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          priority: e.target.value as CasePriority,
                        }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Court info */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Court & Opposing Party
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Court Name
                    </label>
                    <input
                      value={form.courtName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, courtName: e.target.value }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      placeholder="e.g. High Court Division"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Jurisdiction
                    </label>
                    <input
                      value={form.jurisdiction}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          jurisdiction: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      placeholder="e.g. Dhaka"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Opposing Party
                    </label>
                    <input
                      value={form.opposingParty}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          opposingParty: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      placeholder="Name of opposing party"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Opposing Counsel
                    </label>
                    <input
                      value={form.opposingCounsel}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          opposingCounsel: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      placeholder="Opposing lawyer's name"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="filing-date" className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Filing Date
                    </label>
                    <input
                      id="filing-date"
                      type="date"
                      title="Filing Date"
                      value={form.filingDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, filingDate: e.target.value }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="next-hearing-date" className="mb-1 block text-xs font-medium text-on-surface-variant">
                      Next Hearing Date
                    </label>
                    <input
                      id="next-hearing-date"
                      type="date"
                      title="Next Hearing Date"
                      value={form.nextCourtDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          nextCourtDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </fieldset>

              {formError && (
                <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSubmitting ? "Creating..." : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
