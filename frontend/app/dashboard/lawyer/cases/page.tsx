"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, StarOff, Plus, Eye, X } from "lucide-react";
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

type CaseStage = "intake" | "pre-filing" | "filed" | "pre-trial" | "trial" | "post-trial" | "appeal" | "enforcement" | "closed";
type CaseOrigin = "walk-in" | "referral" | "online" | "existing-client" | "court-appointed";

const emptyForm = {
  // Client
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientWhatsapp: "",
  // Case
  type: "civil",
  title: "",
  description: "",
  priority: "medium" as CasePriority,
  stage: "intake" as CaseStage,
  // Court
  courtName: "",
  jurisdiction: "",
  opposingParty: "",
  opposingCounsel: "",
  filingDate: "",
  nextCourtDate: "",
  // Legal
  statute: "",
  // Financial
  caseValue: "",
  retainerAmount: "",
  estimatedFee: "",
  retainerPaid: false,
  // Intake
  referredBy: "",
  caseOrigin: "" as CaseOrigin | "",
  // Additional
  witnessNames: "",
  evidenceSummary: "",
  internalNotes: "",
  notes: "",
  isOnline: true,
};

export default function LawyerCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filtered, setFiltered] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<CaseStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
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
      toast.error(err instanceof Error ? err.message : "Failed to load cases");
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
      const payload = {
        ...form,
        filingDate: form.filingDate || undefined,
        nextCourtDate: form.nextCourtDate || undefined,
        caseValue: form.caseValue ? Number(form.caseValue) : undefined,
        retainerAmount: form.retainerAmount ? Number(form.retainerAmount) : undefined,
        estimatedFee: form.estimatedFee ? Number(form.estimatedFee) : undefined,
        caseOrigin: form.caseOrigin || undefined,
        witnessNames: form.witnessNames
          ? form.witnessNames.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        statute: form.statute || undefined,
        evidenceSummary: form.evidenceSummary || undefined,
        internalNotes: form.internalNotes || undefined,
        notes: form.notes || undefined,
        referredBy: form.referredBy || undefined,
        clientPhone: form.clientPhone || undefined,
        clientWhatsapp: form.clientWhatsapp || undefined,
      };
      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create case");
      setShowAddModal(false);
      setForm(emptyForm);
      toast.success("Case created successfully.");
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
      const next: boolean = data.data.isFeatured;
      setCases((prev) =>
        prev.map((c) => (c._id === caseId ? { ...c, isFeatured: next } : c)),
      );
      toast.success(next ? "Case featured." : "Case unfeatured.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update featured status");
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

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "active").length,
    won: cases.filter((c) => c.status === "won").length,
    closed: cases.filter((c) => c.status === "closed").length,
  };

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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Cases" value={stats.total} />
        <StatsCard label="Active Cases" value={stats.active} />
        <StatsCard label="Won Cases" value={stats.won} />
        <StatsCard label="Closed Cases" value={stats.closed} />
      </div>

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
                <th className="px-3 py-2.5 w-5 sr-only">Featured</th>
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
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-secondary" />
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

            <form onSubmit={handleAddCase} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* CLIENT INFORMATION */}
              <fieldset className="space-y-3 rounded-lg border border-outline-variant p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Client Information
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Client Name *</label>
                    <input required value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Client Email *</label>
                    <input type="email" required value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Client Phone</label>
                    <input type="tel" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="+880 1XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">WhatsApp Number</label>
                    <input type="tel" value={form.clientWhatsapp} onChange={(e) => setForm((f) => ({ ...f, clientWhatsapp: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="For document sharing" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Case Origin</label>
                    <select value={form.caseOrigin} onChange={(e) => setForm((f) => ({ ...f, caseOrigin: e.target.value as CaseOrigin | "" }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none">
                      <option value="">Select origin...</option>
                      <option value="walk-in">Walk-In</option>
                      <option value="referral">Referral</option>
                      <option value="online">Online / Website</option>
                      <option value="existing-client">Existing Client</option>
                      <option value="court-appointed">Court Appointed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Referred By</label>
                    <input value={form.referredBy} onChange={(e) => setForm((f) => ({ ...f, referredBy: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Name of referrer" />
                  </div>
                </div>
              </fieldset>

              {/* CASE DETAILS */}
              <fieldset className="space-y-3 rounded-lg border border-outline-variant p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Case Details
                </legend>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Case Title *</label>
                  <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Brief title of the case" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Description *</label>
                  <textarea required rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none" placeholder="Describe the nature of the case..." />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="case-type" className="mb-1 block text-xs font-medium text-on-surface-variant">Case Type *</label>
                    <select id="case-type" required value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none">
                      {CASE_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="case-priority" className="mb-1 block text-xs font-medium text-on-surface-variant">Priority</label>
                    <select id="case-priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as CasePriority }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="case-stage" className="mb-1 block text-xs font-medium text-on-surface-variant">Case Stage</label>
                    <select id="case-stage" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as CaseStage }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none">
                      <option value="intake">Intake</option>
                      <option value="pre-filing">Pre-Filing</option>
                      <option value="filed">Filed</option>
                      <option value="pre-trial">Pre-Trial</option>
                      <option value="trial">Trial</option>
                      <option value="post-trial">Post-Trial</option>
                      <option value="appeal">Appeal</option>
                      <option value="enforcement">Enforcement</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Applicable Statute / Law</label>
                  <input value={form.statute} onChange={(e) => setForm((f) => ({ ...f, statute: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="e.g. Contract Act 1872, Penal Code s.420" />
                </div>
              </fieldset>

              {/* COURT & OPPOSING PARTY */}
              <fieldset className="space-y-3 rounded-lg border border-outline-variant p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Court & Opposing Party
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Court Name</label>
                    <input value={form.courtName} onChange={(e) => setForm((f) => ({ ...f, courtName: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="e.g. High Court Division" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Jurisdiction</label>
                    <input value={form.jurisdiction} onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="e.g. Dhaka" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Opposing Party</label>
                    <input value={form.opposingParty} onChange={(e) => setForm((f) => ({ ...f, opposingParty: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Name of opposing party" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Opposing Counsel</label>
                    <input value={form.opposingCounsel} onChange={(e) => setForm((f) => ({ ...f, opposingCounsel: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Opposing lawyer's name" />
                  </div>
                  <div>
                    <label htmlFor="filing-date" className="mb-1 block text-xs font-medium text-on-surface-variant">Filing Date</label>
                    <input id="filing-date" type="date" value={form.filingDate} onChange={(e) => setForm((f) => ({ ...f, filingDate: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label htmlFor="next-hearing-date" className="mb-1 block text-xs font-medium text-on-surface-variant">Next Hearing Date</label>
                    <input id="next-hearing-date" type="date" value={form.nextCourtDate} onChange={(e) => setForm((f) => ({ ...f, nextCourtDate: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" />
                  </div>
                </div>
              </fieldset>

              {/* FINANCIAL */}
              <fieldset className="space-y-3 rounded-lg border border-outline-variant p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Financial
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Case Value (৳)</label>
                    <input type="number" min="0" value={form.caseValue} onChange={(e) => setForm((f) => ({ ...f, caseValue: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Monetary value at stake" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Retainer Amount (৳)</label>
                    <input type="number" min="0" value={form.retainerAmount} onChange={(e) => setForm((f) => ({ ...f, retainerAmount: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Retainer fee" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-on-surface-variant">Estimated Fee (৳)</label>
                    <input type="number" min="0" value={form.estimatedFee} onChange={(e) => setForm((f) => ({ ...f, estimatedFee: e.target.value }))}
                      className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Estimated total fee" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input type="checkbox" checked={form.retainerPaid} onChange={(e) => setForm((f) => ({ ...f, retainerPaid: e.target.checked }))}
                    className="h-4 w-4 rounded border-outline" />
                  Retainer has been paid
                </label>
              </fieldset>

              {/* EVIDENCE & WITNESSES */}
              <fieldset className="space-y-3 rounded-lg border border-outline-variant p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Evidence & Witnesses
                </legend>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Witness Names</label>
                  <input value={form.witnessNames} onChange={(e) => setForm((f) => ({ ...f, witnessNames: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" placeholder="Comma-separated names, e.g. John Doe, Jane Smith" />
                  <p className="mt-0.5 text-xs text-on-surface-variant">Separate multiple witnesses with commas</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Evidence Summary</label>
                  <textarea rows={2} value={form.evidenceSummary} onChange={(e) => setForm((f) => ({ ...f, evidenceSummary: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none" placeholder="Key evidence, exhibits, or document list..." />
                </div>
              </fieldset>

              {/* NOTES */}
              <fieldset className="space-y-3 rounded-lg border border-outline-variant p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Notes
                </legend>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Client-Visible Notes</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none" placeholder="Notes visible to client..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-on-surface-variant">Internal Notes (Lawyer Only)</label>
                  <textarea rows={2} value={form.internalNotes} onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                    className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none" placeholder="Private notes not visible to client..." />
                </div>
              </fieldset>

              {formError && (
                <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity">
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

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-on-surface">
        {value}
      </p>
    </div>
  );
}
