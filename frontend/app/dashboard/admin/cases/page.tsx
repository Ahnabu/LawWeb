"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import { Plus, X, ChevronDown, Archive, RotateCcw, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../../../lib/http";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import { Pagination } from "../../../../components/Pagination";
import { ArchivedBadge, askArchiveCase } from "../../../../components/CaseArchive";
import { RichText } from "../../../../components/RichText";
import { RichTextEditor } from "../../../../components/RichTextEditor";
import { CASE_DESCRIPTION_MAX, CASE_NOTES_MAX, isRichTextEmpty } from "../../../../lib/richText";
import {
  archiveCase,
  restoreCase,
  deleteArchivedCase,
  CaseApiError,
  archiveReasonLabel,
  formatCaseDate,
  type CaseArchiveFields,
} from "../../../../lib/cases";

interface LawyerOption {
  _id: string;
  name: string;
  barId?: string;
  isBlocked?: boolean;
}

type CaseView = "active" | "archived";

interface IPayment {
  _id: string;
  amount: number;
  date: string;
  details?: string;
}

interface CaseItem extends CaseArchiveFields {
  _id: string;
  caseNumber?: string;
  title: string;
  description: string;
  status: string;
  type: string;
  isOnline: boolean;
  nextCourtDate?: string;
  notes?: string;
  clientName: string;
  clientEmail: string;
  // null when the assigned lawyer account was deleted
  lawyerId?: { _id: string; name?: string; email?: string; barId?: string; isBlocked?: boolean } | null;
  clientId?: { name?: string; email?: string };
  totalPayment?: number;
  payments?: IPayment[];
  createdAt: string;
}

const CASE_TYPES = [
  "immigration",
  "criminal",
  "civil",
  "corporate",
  "family",
  "real-estate",
  "intellectual-property",
  "banking-finance",
] as const;

const CASE_STATUSES = [
  "active",
  "filed",
  "hearing-scheduled",
  "under-review",
  "closed",
  "won",
  "lost",
] as const;

// Status chips are neutral with a small coloured dot
const STATUS_DOTS: Record<string, string> = {
  active: "bg-sky-600",
  filed: "bg-secondary",
  "hearing-scheduled": "bg-secondary",
  "under-review": "bg-sky-600",
  closed: "bg-outline",
  won: "bg-success",
  lost: "bg-error",
};

const fieldClass = "field";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  title: "",
  clientName: "",
  clientEmail: "",
  lawyerId: "",
  type: "civil" as (typeof CASE_TYPES)[number],
  description: "",
  isOnline: true,
  nextCourtDate: "",
  notes: "",
};

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<CaseView>("active");
  const [counts, setCounts] = useState({ active: 0, archived: 0 });
  // Per-status totals for the current tab (ignore the status filter), for the stat cards
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Ignores responses that arrive after a newer request was started
  const requestId = useRef(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Restore-with-reassignment modal (used when the original lawyer is gone)
  const [restoreTarget, setRestoreTarget] = useState<CaseItem | null>(null);
  const [restoreLawyerId, setRestoreLawyerId] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payments states
  const [isEditingTotalPayment, setIsEditingTotalPayment] = useState<string | null>(null);
  const [tempTotalPayment, setTempTotalPayment] = useState("");
  const [isSavingTotalPayment, setIsSavingTotalPayment] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentDetails, setPaymentDetails] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleToggleExpand = (caseId: string) => {
    if (expandedId === caseId) {
      setExpandedId(null);
    } else {
      setExpandedId(caseId);
      setPaymentAmount("");
      setPaymentDetails("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentError(null);
      setIsEditingTotalPayment(null);
    }
  };

  const handleUpdateTotalPayment = async (caseId: string, amountVal: number) => {
    setIsSavingTotalPayment(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ totalPayment: amountVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update total payment");
      
      setCases((prev) =>
        prev.map((c) => (c._id === caseId ? { ...c, totalPayment: data.data.totalPayment } : c))
      );
      setIsEditingTotalPayment(null);
      toast.success("Total payment updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update total payment");
    } finally {
      setIsSavingTotalPayment(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent, caseId: string) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid positive number.");
      return;
    }
    setIsRecordingPayment(true);
    setPaymentError(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentEntry: {
            amount,
            date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
            details: paymentDetails,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to record payment");
      
      setCases((prev) =>
        prev.map((c) => (c._id === caseId ? { ...c, payments: data.data.payments } : c))
      );
      setPaymentAmount("");
      setPaymentDetails("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      toast.success("Payment recorded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
      setPaymentError(message);
      toast.error(message);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (caseId: string, paymentId: string) => {
    const confirmed = await confirmDialog({
      title: "Delete this payment entry?",
      message: "The payment will be removed from this case's history.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deletePaymentId: paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete payment entry");
      
      setCases((prev) =>
        prev.map((c) => (c._id === caseId ? { ...c, payments: data.data.payments } : c))
      );
      toast.success("Payment entry deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete payment");
    }
  };

  const fetchCases = useCallback(async (options: { quiet?: boolean } = {}) => {
    const id = ++requestId.current;
    if (!options.quiet) setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        archived: view === "archived" ? "true" : "false",
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await apiFetch(`${API_BASE_URL}/api/admin/cases?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(data.message || "Failed to fetch cases");
      const rows: CaseItem[] = data.data ?? [];
      const nextTotal: number = data.meta?.total ?? rows.length;
      setCases(rows);
      setTotal(nextTotal);
      if (data.meta?.counts) setCounts(data.meta.counts);
      setStatusCounts(data.meta?.statusCounts ?? {});
      // The last case on a page was archived or deleted: step back instead of showing an empty page
      if (rows.length === 0 && page > 1 && nextTotal > 0) setPage((p) => Math.max(1, p - 1));
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [statusFilter, view, search, page]);

  // Debounce the search box so typing does not fire a request per keystroke;
  // a new search starts on page 1
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const t = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const fetchLawyers = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/admin/lawyers`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setLawyers(data.data ?? []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    void fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    void fetchLawyers();
  }, [fetchLawyers]);

  // Blocked lawyers cannot be given cases
  const assignableLawyers = lawyers.filter((l) => !l.isBlocked);

  const removeFromList = (id: string, from: CaseView) => {
    setCases((prev) => prev.filter((c) => c._id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
    setCounts((prev) => ({
      active: from === "active" ? Math.max(0, prev.active - 1) : prev.active + 1,
      archived: from === "archived" ? Math.max(0, prev.archived - 1) : prev.archived + 1,
    }));
    // Pull the next case up into this page and refresh the totals
    void fetchCases({ quiet: true });
  };

  const handleArchive = async (item: CaseItem) => {
    const note = await askArchiveCase({
      caseNumber: item.caseNumber,
      title: item.title,
      restoreHint: "You can restore it from the Archived tab at any time.",
    });
    if (note === null) return;
    setBusyId(item._id);
    try {
      const { message } = await archiveCase(item._id, { note, asAdmin: true });
      removeFromList(item._id, "active");
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive case");
    } finally {
      setBusyId(null);
    }
  };

  const openRestoreModal = (item: CaseItem) => {
    setRestoreTarget(item);
    setRestoreLawyerId("");
  };

  const handleRestore = async (item: CaseItem) => {
    // Without a usable lawyer the case must be reassigned as part of the restore
    if (!item.lawyerId || item.lawyerId.isBlocked || item.archiveReason === "lawyer-deleted") {
      openRestoreModal(item);
      return;
    }
    const confirmed = await confirmDialog({
      title: `Restore ${item.caseNumber || "this case"}?`,
      message: `"${item.title}" will return to the active case list, assigned to ${item.lawyerId.name || "its lawyer"}.`,
      confirmLabel: "Restore",
    });
    if (!confirmed) return;
    setBusyId(item._id);
    try {
      const { message } = await restoreCase(item._id, { asAdmin: true });
      removeFromList(item._id, "archived");
      toast.success(message);
    } catch (err) {
      if (err instanceof CaseApiError && err.code === "LAWYER_REQUIRED") {
        toast.error(err.message);
        openRestoreModal(item);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to restore case");
      }
    } finally {
      setBusyId(null);
    }
  };

  const submitRestoreWithLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreTarget) return;
    if (!restoreLawyerId) {
      toast.error("Choose a lawyer to take over this case.");
      return;
    }
    setIsRestoring(true);
    try {
      const { message } = await restoreCase(restoreTarget._id, { asAdmin: true, lawyerId: restoreLawyerId });
      removeFromList(restoreTarget._id, "archived");
      setRestoreTarget(null);
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore case");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeletePermanently = async (item: CaseItem) => {
    const phrase = item.caseNumber || "DELETE";
    const confirmed = await confirmDialog({
      title: `Delete ${item.caseNumber || "this case"} permanently?`,
      message: "This removes the case, its hearings, documents and payment history for good. It cannot be undone.",
      confirmLabel: "Delete permanently",
      tone: "danger",
      confirmPhrase: phrase,
    });
    if (!confirmed) return;
    setBusyId(item._id);
    try {
      const { message } = await deleteArchivedCase(item._id);
      setCases((prev) => prev.filter((c) => c._id !== item._id));
      setCounts((prev) => ({ ...prev, archived: Math.max(0, prev.archived - 1) }));
      void fetchCases({ quiet: true });
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete case");
    } finally {
      setBusyId(null);
    }
  };

  const updateCaseStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/admin/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update status");
      }
      setCases((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c)),
      );
      // Refresh the stat cards (and drop the case if it no longer matches the filter)
      void fetchCases({ quiet: true });
      toast.success("Case status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.title || !form.clientName || !form.clientEmail || !form.lawyerId || !form.description) {
      setFormError("Please fill all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/admin/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create case");
      setShowModal(false);
      setForm(EMPTY_FORM);
      // The new case is the newest, so it shows on page 1 of the active tab
      if (view === "active" && page === 1) void fetchCases();
      else {
        setView("active");
        setPage(1);
      }
      toast.success(data.message || "Case created");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusFilters = ["all", ...CASE_STATUSES];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            Cases
          </h3>
          <p className="text-sm text-on-surface-variant">
            Monitor and manage all case activity across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Case
        </button>
      </header>

      {/* Active / Archived tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Case list" className="panel flex gap-1 p-1">
          {(["active", "archived"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => {
                setView(v);
                setPage(1);
                setExpandedId(null);
              }}
              className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors sm:flex-none ${
                view === v
                  ? "border border-outline-variant bg-surface-raised text-on-surface shadow-sm"
                  : "border border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {v === "active" ? "Active" : "Archived"} <span className="tabular-nums opacity-70">{counts[v]}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Search cases</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Case #, title, client name or email"
            className="field pl-9"
          />
        </label>
      </div>

      {view === "archived" && (
        <p className="notice text-on-surface-variant">
          Archived cases are read-only. Cases land here when they are archived manually or when their lawyer&apos;s
          account is deleted. Restore a case to edit it again, or delete it permanently.
        </p>
      )}

      {/* Filters (each shows its total for the current tab) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={statusFilter === s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className="chip capitalize"
          >
            {s.replace("-", " ")}
            {!isLoading && !error && (
              <span className="tabular-nums opacity-70">{statusCounts[s] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card h-80 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : cases.length === 0 ? (
        <div className="card p-10 text-center text-sm text-on-surface-variant">
          No {view === "archived" ? "archived " : ""}cases found
          {statusFilter !== "all" ? ` with status "${statusFilter.replace(/-/g, " ")}"` : ""}
          {search ? ` matching "${search}"` : ""}.
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="card divide-y divide-outline-variant overflow-hidden">
          {cases.map((item) => (
            <li
              key={item._id}
              className={expandedId === item._id ? "bg-surface-container/40" : ""}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {item.caseNumber && (
                      <span className="text-xs font-mono text-gold-ink">{item.caseNumber}</span>
                    )}
                    <span className="chip capitalize">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[item.status] ?? "bg-outline"}`} />
                      {item.status.replace("-", " ")}
                    </span>
                    <span className="text-xs text-on-surface-variant capitalize">
                      {item.type.replace("-", " ")} &middot; {item.isOnline ? "Online" : "Offline"}
                    </span>
                    {item.isArchived && (
                      <ArchivedBadge
                        label={archiveReasonLabel(item)}
                        tone={item.archiveReason === "lawyer-deleted" ? "danger" : "neutral"}
                      />
                    )}
                  </div>
                  <p className="font-semibold text-on-surface truncate">{item.title}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Client: {item.clientName} &middot; Lawyer:{" "}
                    {item.lawyerId?.name ? (
                      <>
                        {item.lawyerId.name}
                        {item.lawyerId.isBlocked && <span className="text-error"> (blocked)</span>}
                      </>
                    ) : item.formerLawyer?.name ? (
                      <span className="text-error">Former lawyer: {item.formerLawyer.name} (removed)</span>
                    ) : (
                      "—"
                    )}
                  </p>
                  {item.isArchived && (
                    <p className="mt-0.5 text-sm text-on-surface-variant">Archived {formatCaseDate(item.archivedAt)}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  {item.isArchived ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === item._id}
                        onClick={() => handleRestore(item)}
                        className="btn btn-secondary btn-sm"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Restore
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item._id}
                        onClick={() => handleDeletePermanently(item)}
                        className="btn btn-ghost btn-sm hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === item._id}
                      onClick={() => handleArchive(item)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(item._id)}
                    className="btn btn-ghost btn-icon"
                    aria-label="Toggle details"
                    aria-expanded={expandedId === item._id}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expandedId === item._id ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              {expandedId === item._id && (
                <div className="space-y-5 border-t border-outline-variant px-4 py-5 sm:px-5">
                  {item.isArchived && (
                    <div className="panel grid gap-3 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-on-surface-variant">Archive reason</p>
                        <p className="mt-0.5 text-on-surface">
                          {item.archiveReason === "lawyer-deleted" ? "Lawyer removed from the firm" : archiveReasonLabel(item)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-on-surface-variant">Archived on</p>
                        <p className="mt-0.5 text-on-surface">{formatCaseDate(item.archivedAt)}</p>
                      </div>
                      {item.formerLawyer?.name && (
                        <div className="sm:col-span-2">
                          <p className="text-sm text-on-surface-variant">Former lawyer</p>
                          <p className="mt-0.5 text-on-surface">
                            {item.formerLawyer.name}
                            {item.formerLawyer.barId ? ` (${item.formerLawyer.barId})` : ""}
                            {item.formerLawyer.email ? ` · ${item.formerLawyer.email}` : ""}
                          </p>
                        </div>
                      )}
                      {item.archiveNote && (
                        <div className="sm:col-span-2">
                          <p className="text-sm text-on-surface-variant">Note</p>
                          <p className="mt-0.5 text-on-surface">{item.archiveNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <RichText value={item.description} tone="strong" />
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <p className="text-sm text-on-surface-variant">Client Email</p>
                      <p className="mt-0.5 break-all text-on-surface">{item.clientEmail}</p>
                    </div>
                    {item.lawyerId?.barId && (
                      <div>
                        <p className="text-sm text-on-surface-variant">Lawyer Bar ID</p>
                        <p className="mt-0.5 text-on-surface">{item.lawyerId.barId}</p>
                      </div>
                    )}
                    {item.nextCourtDate && (
                      <div>
                        <p className="text-sm text-on-surface-variant">Next Court Date</p>
                        <p className="mt-0.5 text-on-surface">
                          {new Date(item.nextCourtDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-on-surface-variant">Added</p>
                      <p className="mt-0.5 text-on-surface">
                        {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {!isRichTextEmpty(item.notes) && (
                    <div>
                      <p className="text-sm text-on-surface-variant">Notes</p>
                      <RichText value={item.notes} tone="strong" className="mt-1" />
                    </div>
                  )}

                  {/* Financials & Payments Section */}
                  <div className="border-t border-outline-variant pt-5 space-y-4">
                    <h4 className="font-display text-base font-semibold text-on-surface">Financials & Payments</h4>
                    <div className={`grid gap-4 ${item.isArchived ? "" : "sm:grid-cols-2"}`}>
                      {/* Column 1: Summary */}
                      <div className="panel p-4 space-y-3">
                        <div className="flex justify-between items-center gap-3 text-sm">
                          <span className="text-on-surface-variant">Total Payment:</span>
                          {isEditingTotalPayment === item._id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                title="Edit Total Payment"
                                className="field min-h-9 w-28 px-2 py-1"
                                value={tempTotalPayment}
                                onChange={(e) => setTempTotalPayment(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateTotalPayment(item._id, Number(tempTotalPayment))}
                                disabled={isSavingTotalPayment}
                                className="btn btn-primary btn-sm"
                              >
                                {isSavingTotalPayment ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingTotalPayment(null)}
                                className="btn btn-ghost btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-on-surface tabular-nums">৳{(item.totalPayment || 0).toLocaleString()}</span>
                              {!item.isArchived && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempTotalPayment(String(item.totalPayment || 0));
                                    setIsEditingTotalPayment(item._id);
                                  }}
                                  className="text-link text-xs"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-sm border-t border-outline-variant pt-3">
                          <span className="text-on-surface-variant">Total Paid:</span>
                          <span className="font-semibold text-success tabular-nums">
                            ৳{(item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">Remaining Balance:</span>
                          <span className={`font-bold tabular-nums ${Math.max(0, (item.totalPayment || 0) - (item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) > 0 ? "text-error" : "text-success"}`}>
                            ৳{Math.max(0, (item.totalPayment || 0) - (item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Column 2: Record Payment (not on archived cases) */}
                      {!item.isArchived && (
                      <form onSubmit={(e) => handleRecordPayment(e, item._id)} className="panel p-4 space-y-3">
                        <h5 className="text-sm font-semibold text-on-surface">Record Offline Payment</h5>
                        <div className="grid gap-3 grid-cols-2">
                          <div>
                            <label htmlFor={`pay-amount-${item._id}`} className="label">Amount (৳)</label>
                            <input
                              id={`pay-amount-${item._id}`}
                              type="number"
                              min="1"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="Amount"
                              className={fieldClass}
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor={`pay-date-${item._id}`} className="label">Date</label>
                            <input
                              id={`pay-date-${item._id}`}
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className={fieldClass}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`pay-details-${item._id}`} className="label">Details</label>
                          <input
                            id={`pay-details-${item._id}`}
                            type="text"
                            value={paymentDetails}
                            onChange={(e) => setPaymentDetails(e.target.value)}
                            placeholder="e.g. Cash / Bank transfer"
                            className={fieldClass}
                          />
                        </div>
                        {paymentError && <p className="error-text mt-0" role="alert">{paymentError}</p>}
                        <button
                          type="submit"
                          disabled={isRecordingPayment}
                          className="btn btn-primary btn-sm btn-block"
                        >
                          {isRecordingPayment ? "Recording..." : "Record Payment"}
                        </button>
                      </form>
                      )}
                    </div>

                    {/* Payment History List */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-on-surface">Payment History Logs</h5>
                      {!item.payments || item.payments.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">No payments recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-raised">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-outline-variant bg-surface-container text-on-surface-variant">
                                <th className="px-3 py-2 font-semibold">Date</th>
                                <th className="px-3 py-2 font-semibold">Details</th>
                                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                {!item.isArchived && <th className="px-3 py-2 text-right font-semibold"><span className="sr-only">Action</span></th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                              {item.payments.map((p) => (
                                <tr key={p._id} className="text-on-surface">
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {new Date(p.date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                                  </td>
                                  <td className="px-3 py-2">{p.details || "—"}</td>
                                  <td className="px-3 py-2 text-right font-medium text-success tabular-nums whitespace-nowrap">
                                    ৳{p.amount.toLocaleString()}
                                  </td>
                                  {!item.isArchived && (
                                    <td className="px-2 py-1 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(item._id, p._id)}
                                        className="btn btn-ghost btn-sm hover:text-error"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status update (archived cases are read-only) */}
                  {!item.isArchived && (
                  <div className="flex flex-wrap gap-2 border-t border-outline-variant pt-5">
                    <p className="w-full text-sm font-semibold text-on-surface">Update Status</p>
                    {CASE_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={item.status === s}
                        disabled={item.status === s || updatingId === item._id}
                        onClick={() => updateCaseStatus(item._id, s)}
                        className={`chip capitalize disabled:cursor-default ${item.status !== s ? "disabled:opacity-50" : ""}`}
                      >
                        {updatingId === item._id ? "Saving…" : s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </li>
          ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(next) => {
              setPage(next);
              setExpandedId(null);
            }}
          />
        </div>
      )}

      {/* Add Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgb(10_22_40/0.55)] p-4 pt-12 overflow-y-auto sm:pt-16">
          <div role="dialog" aria-modal="true" aria-labelledby="add-case-title" className="card w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
              <h3 id="add-case-title" className="font-display text-lg font-semibold text-on-surface">Add New Case</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => { setShowModal(false); setFormError(null); setForm(EMPTY_FORM); }}
                className="btn btn-ghost btn-icon -mr-2"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 px-5 py-5 sm:px-6">
              {formError && (
                <p className="notice notice-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="label">Case Title <span className="text-error">*</span></span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className={fieldClass}
                    placeholder="Brief case title"
                  />
                </label>

                <label className="block">
                  <span className="label">Client Name <span className="text-error">*</span></span>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                    className={fieldClass}
                    placeholder="Full name"
                  />
                </label>

                <label className="block">
                  <span className="label">Client Email <span className="text-error">*</span></span>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                    className={fieldClass}
                    placeholder="client@email.com"
                  />
                </label>

                <label className="block">
                  <span className="label">Assign Lawyer <span className="text-error">*</span></span>
                  <select
                    value={form.lawyerId}
                    onChange={(e) => setForm((f) => ({ ...f, lawyerId: e.target.value }))}
                    className={fieldClass}
                  >
                    <option value="">Select lawyer</option>
                    {assignableLawyers.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}{l.barId ? ` (${l.barId})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="label">Case Type <span className="text-error">*</span></span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
                    className={fieldClass}
                  >
                    {CASE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="block sm:col-span-2">
                  <span id="admin-case-description-label" className="label">Description <span className="text-error">*</span></span>
                  <RichTextEditor
                    ariaLabelledBy="admin-case-description-label"
                    value={form.description}
                    onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                    maxLength={CASE_DESCRIPTION_MAX}
                    minHeightClass="min-h-24"
                    placeholder="Describe the case..."
                  />
                </div>

                <label className="block">
                  <span className="label">Next Court Date</span>
                  <input
                    type="date"
                    value={form.nextCourtDate}
                    onChange={(e) => setForm((f) => ({ ...f, nextCourtDate: e.target.value }))}
                    className={fieldClass}
                  />
                </label>

                <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-on-surface">
                  <input
                    type="checkbox"
                    checked={form.isOnline}
                    onChange={(e) => setForm((f) => ({ ...f, isOnline: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  Online Case
                </label>

                <div className="block sm:col-span-2">
                  <span id="admin-case-notes-label" className="label">Notes <span className="font-normal text-on-surface-variant">(visible to the client)</span></span>
                  <RichTextEditor
                    ariaLabelledBy="admin-case-notes-label"
                    value={form.notes}
                    onChange={(html) => setForm((f) => ({ ...f, notes: html }))}
                    maxLength={CASE_NOTES_MAX}
                    minHeightClass="min-h-20"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              </div>
              <div className="flex gap-2 justify-end border-t border-outline-variant px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); setForm(EMPTY_FORM); }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? "Creating…" : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore + reassign modal */}
      {restoreTarget && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.55)] p-4 pt-12 sm:pt-16"
          onMouseDown={() => !isRestoring && setRestoreTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-case-title"
            onMouseDown={(e) => e.stopPropagation()}
            className="card w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
              <h3 id="restore-case-title" className="font-display text-lg font-semibold text-on-surface">
                Restore {restoreTarget.caseNumber || "case"}
              </h3>
              <button
                type="button"
                aria-label="Close"
                disabled={isRestoring}
                onClick={() => setRestoreTarget(null)}
                className="btn btn-ghost btn-icon -mr-2"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submitRestoreWithLawyer}>
              <div className="space-y-4 px-5 py-5 sm:px-6">
              <p className="text-sm leading-6 text-on-surface-variant">
                {restoreTarget.lawyerId?.name ? (
                  <>
                    {restoreTarget.lawyerId.name}&apos;s account is blocked, so &quot;{restoreTarget.title}&quot; needs a
                    new lawyer before it can return to the active list.
                  </>
                ) : (
                  <>
                    {restoreTarget.formerLawyer?.name
                      ? `${restoreTarget.formerLawyer.name} was removed from the firm`
                      : "The lawyer on this case no longer exists"}
                    , so &quot;{restoreTarget.title}&quot; needs a new lawyer before it can return to the active list.
                  </>
                )}
              </p>
              <label className="block">
                <span className="label">Assign to <span className="text-error">*</span></span>
                <select
                  value={restoreLawyerId}
                  onChange={(e) => setRestoreLawyerId(e.target.value)}
                  className={fieldClass}
                  required
                >
                  <option value="">Select lawyer</option>
                  {assignableLawyers.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}{l.barId ? ` (${l.barId})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {assignableLawyers.length === 0 && (
                <p className="error-text mt-0">There are no active lawyers to assign. Add or unblock a lawyer first.</p>
              )}
              </div>
              <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => setRestoreTarget(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestoring || !restoreLawyerId}
                  className="btn btn-primary"
                >
                  {isRestoring ? "Restoring…" : "Restore & assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
