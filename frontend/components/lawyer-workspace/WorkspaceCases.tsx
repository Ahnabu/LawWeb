"use client";

import { createWorkspaceCase, getWorkspaceCases, type WorkspaceLawyerId } from "../../lib/workspace";
import { useWorkspace } from "./useWorkspace";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, StarOff, Plus, Eye, X, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "../../lib/api";
import { apiFetch } from "../../lib/http";
import { confirmDialog } from "../ConfirmDialog";
import { ArchivedBadge, askArchiveCase } from "../CaseArchive";
import { RichTextEditor } from "../RichTextEditor";
import { CASE_DESCRIPTION_MAX, CASE_NOTES_MAX, isRichTextEmpty } from "../../lib/richText";
import {
  archiveCase,
  restoreCase,
  archiveReasonLabel,
  canLawyerRestore,
  formatCaseDate,
  type CaseArchiveFields,
} from "../../lib/cases";

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

interface CaseItem extends CaseArchiveFields {
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
  filed: "bg-secondary/15 text-gold-ink",
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
  medium: "bg-secondary/15 text-gold-ink",
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

export function WorkspaceCases({ basePath, lawyerId }: { basePath: string; lawyerId: WorkspaceLawyerId }) {
  const workspace = useWorkspace(lawyerId);
  const canCreate = workspace.can("cases.create");
  const canArchive = workspace.can("cases.archive");
  const canFeature = workspace.can("cases.feature");
  const canEditFinance = workspace.can("cases.finance.edit");
  const canEditConfidential = workspace.can("cases.confidential.edit");
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filtered, setFiltered] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<CaseStatus | "all">("all");
  const [view, setView] = useState<"active" | "archived">("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      // Load active and archived together; the tabs split them client-side
      setCases(await getWorkspaceCases<CaseItem>(lawyerId, "all"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the workspace lawyer changes
  }, [lawyerId]);

  useEffect(() => {
    const inView = cases.filter((c) => (view === "archived" ? c.isArchived : !c.isArchived));
    const sorted = [...inView].sort((a, b) =>
      a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1,
    );
    if (activeTab === "all") {
      setFiltered(sorted);
    } else {
      setFiltered(sorted.filter((c) => c.status === activeTab));
    }
  }, [activeTab, cases, view]);

  const handleArchive = async (c: CaseItem) => {
    const note = await askArchiveCase({
      caseNumber: c.caseNumber,
      title: c.title,
      restoreHint: "You can restore it from the Archived tab.",
    });
    if (note === null) return;
    setBusyId(c._id);
    try {
      const { message, data } = await archiveCase<CaseItem>(c._id, { note });
      setCases((prev) =>
        prev.map((x) =>
          x._id === c._id
            ? {
                ...x,
                isArchived: true,
                archivedAt: data.archivedAt,
                archivedBy: data.archivedBy,
                archiveReason: data.archiveReason,
                archiveNote: data.archiveNote,
              }
            : x,
        ),
      );
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive case");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (c: CaseItem) => {
    const confirmed = await confirmDialog({
      title: `Restore ${c.caseNumber}?`,
      message: `"${c.title}" will return to your active cases.`,
      confirmLabel: "Restore",
    });
    if (!confirmed) return;
    setBusyId(c._id);
    try {
      const { message } = await restoreCase(c._id);
      setCases((prev) =>
        prev.map((x) =>
          x._id === c._id
            ? { ...x, isArchived: false, archivedAt: null, archivedBy: null, archiveReason: null, archiveNote: undefined }
            : x,
        ),
      );
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore case");
    } finally {
      setBusyId(null);
    }
  };

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    // The rich-text editor has no native `required`, so check it here
    if (isRichTextEmpty(form.description)) {
      setFormError("Please describe the case.");
      return;
    }
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
      // Only send the sections this account may fill in (the API refuses the rest)
      const { caseValue, retainerAmount, estimatedFee, retainerPaid, witnessNames, evidenceSummary, internalNotes, ...general } = payload;
      await createWorkspaceCase(lawyerId, {
        ...general,
        ...(canEditFinance ? { caseValue, retainerAmount, estimatedFee, retainerPaid } : {}),
        ...(canEditConfidential ? { witnessNames, evidenceSummary, internalNotes } : {}),
      });
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
      const res = await apiFetch(
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

  const liveCases = cases.filter((c) => !c.isArchived);
  const archivedCount = cases.length - liveCases.length;
  const stats = {
    total: liveCases.length,
    active: liveCases.filter((c) => c.status === "active").length,
    won: liveCases.filter((c) => c.status === "won").length,
    closed: liveCases.filter((c) => c.status === "closed").length,
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-2xl font-semibold text-heading">
            {workspace.isOwn ? "My Cases" : "Cases"}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {workspace.isOwn
              ? "Track and manage your assigned legal matters."
              : `${workspace.lawyerName ?? "The lawyer"}'s legal matters.`}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add Case
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Cases" value={stats.total} />
        <StatsCard label="Active Cases" value={stats.active} />
        <StatsCard label="Won Cases" value={stats.won} />
        <StatsCard label="Closed Cases" value={stats.closed} />
      </div>

      {/* Active / Archived */}
      <div role="tablist" aria-label="Case list" className="panel flex w-full gap-1 p-1 sm:w-fit">
        {(["active", "archived"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`flex flex-1 items-center justify-center gap-1.5 min-h-9 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:flex-none ${
              view === v ? "bg-surface-raised font-semibold text-on-surface shadow-[inset_0_1px_0_var(--highlight),0_1px_2px_rgb(16_24_40/0.12)]" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {v === "archived" && <Archive className="h-3.5 w-3.5" />}
            {v === "active" ? `Active (${liveCases.length})` : `Archived (${archivedCount})`}
          </button>
        ))}
      </div>

      {view === "archived" && (
        <p className="notice text-xs text-on-surface-variant">
          Archived cases are read-only. Cases archived from this workspace can be restored here; cases
          archived by an administrator can only be restored by an admin.
        </p>
      )}

      {/* Status filter tabs */}
      <div className="panel flex gap-1 overflow-x-auto p-1">
        {STATUS_FILTERS.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
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
          {view === "archived" ? (
            "No archived cases."
          ) : (
            <>
              No cases found.{" "}
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="text-link"
                >
                  Add your first case.
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container text-left text-xs font-semibold text-on-surface-variant">
                <th className="px-3 py-2.5 w-5 sr-only">Featured</th>
                <th className="px-3 py-2.5">Case #</th>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">{view === "archived" ? "Archived" : "Next Hearing"}</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((c) => (
                <tr
                  key={c._id}
                  className={`hover:bg-surface-container-low transition-colors ${c.isFeatured ? "bg-secondary/5" : ""}`}
                >
                  {/* Featured star */}
                  <td className="px-3 py-2.5">
                    {canFeature ? (
                      <button
                        type="button"
                        aria-label={c.isFeatured ? "Unfeature case" : "Feature case"}
                        disabled={togglingId === c._id || c.isArchived}
                        onClick={() => toggleFeatured(c._id)}
                        className="text-on-surface-variant hover:text-gold-ink transition-colors disabled:opacity-40"
                      >
                        {c.isFeatured ? (
                          <Star className="h-4 w-4 fill-secondary text-gold-ink" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                    ) : c.isFeatured ? (
                      <Star className="h-4 w-4 fill-secondary text-gold-ink" aria-label="Featured" />
                    ) : null}
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
                      className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[c.priority]}`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[c.status]}`}
                    >
                      {c.status.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap text-xs">
                    {c.isArchived ? (
                      <div className="space-y-1">
                        <div>{formatCaseDate(c.archivedAt)}</div>
                        <ArchivedBadge label={archiveReasonLabel(c)} />
                      </div>
                    ) : c.nextCourtDate
                      ? new Date(c.nextCourtDate).toLocaleDateString("en-BD", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Link
                        href={`${basePath}/cases/${c._id}`}
                        className="btn btn-ghost btn-sm min-h-8 px-2 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-gold-ink" />
                        View
                      </Link>
                      {!canArchive ? null : !c.isArchived ? (
                        <button
                          type="button"
                          disabled={busyId === c._id}
                          onClick={() => handleArchive(c)}
                          className="btn btn-ghost btn-sm min-h-8 px-2 text-xs"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </button>
                      ) : canLawyerRestore(c, workspace.lawyerId) ? (
                        <button
                          type="button"
                          disabled={busyId === c._id}
                          onClick={() => handleRestore(c)}
                          className="btn btn-ghost btn-sm min-h-8 px-2 text-xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      ) : null}
                    </div>
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.5)] p-4 py-8"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card w-full max-w-2xl p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-heading">
                Add New Case
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost btn-icon"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCase} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* CLIENT INFORMATION */}
              <fieldset className="panel space-y-3 p-4">
                <legend className="px-1 text-sm font-semibold text-on-surface-variant">
                  Client Information
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Client Name *</label>
                    <input required value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                      className="field" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Client Email *</label>
                    <input type="email" required value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                      className="field" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="label">Client Phone</label>
                    <input type="tel" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                      className="field" placeholder="+880 1XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="label">WhatsApp Number</label>
                    <input type="tel" value={form.clientWhatsapp} onChange={(e) => setForm((f) => ({ ...f, clientWhatsapp: e.target.value }))}
                      className="field" placeholder="For document sharing" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Case Origin</label>
                    <select value={form.caseOrigin} onChange={(e) => setForm((f) => ({ ...f, caseOrigin: e.target.value as CaseOrigin | "" }))}
                      className="field">
                      <option value="">Select origin...</option>
                      <option value="walk-in">Walk-In</option>
                      <option value="referral">Referral</option>
                      <option value="online">Online / Website</option>
                      <option value="existing-client">Existing Client</option>
                      <option value="court-appointed">Court Appointed</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Referred By</label>
                    <input value={form.referredBy} onChange={(e) => setForm((f) => ({ ...f, referredBy: e.target.value }))}
                      className="field" placeholder="Name of referrer" />
                  </div>
                </div>
              </fieldset>

              {/* CASE DETAILS */}
              <fieldset className="panel space-y-3 p-4">
                <legend className="px-1 text-sm font-semibold text-on-surface-variant">
                  Case Details
                </legend>
                <div>
                  <label className="label">Case Title *</label>
                  <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="field" placeholder="Brief title of the case" />
                </div>
                <div>
                  <p id="new-case-description-label" className="label">Description *</p>
                  <RichTextEditor
                    ariaLabelledBy="new-case-description-label"
                    value={form.description}
                    onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                    maxLength={CASE_DESCRIPTION_MAX}
                    minHeightClass="min-h-24"
                    placeholder="Describe the nature of the case..."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="case-type" className="label">Case Type *</label>
                    <select id="case-type" required value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="field">
                      {CASE_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="case-priority" className="label">Priority</label>
                    <select id="case-priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as CasePriority }))}
                      className="field">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="case-stage" className="label">Case Stage</label>
                    <select id="case-stage" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as CaseStage }))}
                      className="field">
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
                  <label className="label">Applicable Statute / Law</label>
                  <input value={form.statute} onChange={(e) => setForm((f) => ({ ...f, statute: e.target.value }))}
                    className="field" placeholder="e.g. Contract Act 1872, Penal Code s.420" />
                </div>
              </fieldset>

              {/* COURT & OPPOSING PARTY */}
              <fieldset className="panel space-y-3 p-4">
                <legend className="px-1 text-sm font-semibold text-on-surface-variant">
                  Court & Opposing Party
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Court Name</label>
                    <input value={form.courtName} onChange={(e) => setForm((f) => ({ ...f, courtName: e.target.value }))}
                      className="field" placeholder="e.g. High Court Division" />
                  </div>
                  <div>
                    <label className="label">Jurisdiction</label>
                    <input value={form.jurisdiction} onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                      className="field" placeholder="e.g. Dhaka" />
                  </div>
                  <div>
                    <label className="label">Opposing Party</label>
                    <input value={form.opposingParty} onChange={(e) => setForm((f) => ({ ...f, opposingParty: e.target.value }))}
                      className="field" placeholder="Name of opposing party" />
                  </div>
                  <div>
                    <label className="label">Opposing Counsel</label>
                    <input value={form.opposingCounsel} onChange={(e) => setForm((f) => ({ ...f, opposingCounsel: e.target.value }))}
                      className="field" placeholder="Opposing lawyer's name" />
                  </div>
                  <div>
                    <label htmlFor="filing-date" className="label">Filing Date</label>
                    <input id="filing-date" type="date" value={form.filingDate} onChange={(e) => setForm((f) => ({ ...f, filingDate: e.target.value }))}
                      className="field" />
                  </div>
                  <div>
                    <label htmlFor="next-hearing-date" className="label">Next Hearing Date</label>
                    <input id="next-hearing-date" type="date" value={form.nextCourtDate} onChange={(e) => setForm((f) => ({ ...f, nextCourtDate: e.target.value }))}
                      className="field" />
                  </div>
                </div>
              </fieldset>

              {/* FINANCIAL */}
              {canEditFinance && (
              <fieldset className="panel space-y-3 p-4">
                <legend className="px-1 text-sm font-semibold text-on-surface-variant">
                  Financial
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Case Value (৳)</label>
                    <input type="number" min="0" value={form.caseValue} onChange={(e) => setForm((f) => ({ ...f, caseValue: e.target.value }))}
                      className="field" placeholder="Monetary value at stake" />
                  </div>
                  <div>
                    <label className="label">Retainer Amount (৳)</label>
                    <input type="number" min="0" value={form.retainerAmount} onChange={(e) => setForm((f) => ({ ...f, retainerAmount: e.target.value }))}
                      className="field" placeholder="Retainer fee" />
                  </div>
                  <div>
                    <label className="label">Estimated Fee (৳)</label>
                    <input type="number" min="0" value={form.estimatedFee} onChange={(e) => setForm((f) => ({ ...f, estimatedFee: e.target.value }))}
                      className="field" placeholder="Estimated total fee" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input type="checkbox" checked={form.retainerPaid} onChange={(e) => setForm((f) => ({ ...f, retainerPaid: e.target.checked }))}
                    className="h-4 w-4 rounded border-outline" />
                  Retainer has been paid
                </label>
              </fieldset>
              )}

              {/* EVIDENCE & WITNESSES */}
              {canEditConfidential && (
              <fieldset className="panel space-y-3 p-4">
                <legend className="px-1 text-sm font-semibold text-on-surface-variant">
                  Evidence & Witnesses
                </legend>
                <div>
                  <label className="label">Witness Names</label>
                  <input value={form.witnessNames} onChange={(e) => setForm((f) => ({ ...f, witnessNames: e.target.value }))}
                    className="field" placeholder="Comma-separated names, e.g. John Doe, Jane Smith" />
                  <p className="mt-0.5 text-xs text-on-surface-variant">Separate multiple witnesses with commas</p>
                </div>
                <div>
                  <label className="label">Evidence Summary</label>
                  <textarea rows={2} value={form.evidenceSummary} onChange={(e) => setForm((f) => ({ ...f, evidenceSummary: e.target.value }))}
                    className="field resize-none" placeholder="Key evidence, exhibits, or document list..." />
                </div>
              </fieldset>
              )}

              {/* NOTES */}
              <fieldset className="panel space-y-3 p-4">
                <legend className="px-1 text-sm font-semibold text-on-surface-variant">
                  Notes
                </legend>
                <div>
                  <p id="new-case-notes-label" className="label">Client-Visible Notes</p>
                  <RichTextEditor
                    ariaLabelledBy="new-case-notes-label"
                    value={form.notes}
                    onChange={(html) => setForm((f) => ({ ...f, notes: html }))}
                    maxLength={CASE_NOTES_MAX}
                    minHeightClass="min-h-20"
                    placeholder="Notes visible to client..."
                  />
                </div>
                {canEditConfidential && (
                  <div>
                    <label className="label">Internal Notes (Lawyer Only)</label>
                    <textarea rows={2} value={form.internalNotes} onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                      className="field resize-none" placeholder="Private notes not visible to client..." />
                  </div>
                )}
              </fieldset>

              {formError && (
                <p className="notice notice-error">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="btn btn-primary">
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
    <div className="card p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-heading">
        {value}
      </p>
    </div>
  );
}
