"use client";

import type { WorkspaceLawyerId } from "../../lib/workspace";
import { useWorkspace } from "./useWorkspace";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, StarOff, Archive, RotateCcw } from "lucide-react";
import { API_BASE_URL } from "../../lib/api";
import { toast } from "sonner";
import { apiFetch } from "../../lib/http";
import { confirmDialog } from "../ConfirmDialog";
import { askArchiveCase } from "../CaseArchive";
import { RichText } from "../RichText";
import { RichTextEditor } from "../RichTextEditor";
import { CASE_NOTES_MAX } from "../../lib/richText";
import {
  archiveCase,
  restoreCase,
  archivedByName,
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

interface IHearing {
  _id?: string;
  date: string;
  description: string;
  outcome?: string;
  nextSteps?: string;
}

interface ICaseDocument {
  _id?: string;
  name: string;
  documentType?: string;
  sharedVia: string;
  date: string;
  notes?: string;
}

interface IPayment {
  _id: string;
  amount: number;
  date: string;
  details?: string;
}

interface CaseDetail extends CaseArchiveFields {
  _id: string;
  caseNumber: string;
  title: string;
  description: string;
  type: string;
  status: CaseStatus;
  stage?: string;
  priority: CasePriority;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientId?: { name: string; email: string; phone?: string };
  isFeatured: boolean;
  isOnline: boolean;
  courtName?: string;
  jurisdiction?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  filingDate?: string;
  nextCourtDate?: string;
  statute?: string;
  caseValue?: number;
  retainerAmount?: number;
  estimatedFee?: number;
  retainerPaid?: boolean;
  totalPayment?: number;
  payments?: IPayment[];
  referredBy?: string;
  caseOrigin?: string;
  witnessNames?: string[];
  evidenceSummary?: string;
  hearingHistory?: IHearing[];
  documents?: ICaseDocument[];
  notes?: string;
  internalNotes?: string;
  lawyerId?: { name: string; email: string; barId?: string };
  createdAt: string;
  updatedAt: string;
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

const ALL_STATUSES: CaseStatus[] = [
  "active", "filed", "hearing-scheduled", "under-review",
  "closed", "won", "lost", "settled", "appealed",
];

export function WorkspaceCaseDetail({ lawyerId }: { lawyerId: WorkspaceLawyerId }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const workspace = useWorkspace(lawyerId);
  // Each section needs its own permission; the API refuses the same writes
  const canEdit = workspace.can("cases.edit");
  const canArchive = workspace.can("cases.archive");
  const canFeature = workspace.can("cases.feature");
  const canViewFinance = workspace.can("cases.finance.view");
  const canEditFinance = workspace.can("cases.finance.edit");
  const canEditConfidential = workspace.can("cases.confidential.edit");
  const [isArchiving, setIsArchiving] = useState(false);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>("active");
  const [selectedStage, setSelectedStage] = useState("");
  const [nextCourtDate, setNextCourtDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Payments states
  const [isEditingTotalPayment, setIsEditingTotalPayment] = useState(false);
  const [tempTotalPayment, setTempTotalPayment] = useState("");
  const [isSavingTotalPayment, setIsSavingTotalPayment] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentDetails, setPaymentDetails] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const totalPaid = caseData?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remainingAmount = Math.max(0, (caseData?.totalPayment || 0) - totalPaid);

  const handleSaveTotalPayment = async () => {
    if (!caseData) return;
    const value = Number(tempTotalPayment);
    if (isNaN(value) || value < 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setIsSavingTotalPayment(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ totalPayment: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update total payment");
      setCaseData(data.data);
      setIsEditingTotalPayment(false);
      toast.success("Total payment updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update total payment");
    } finally {
      setIsSavingTotalPayment(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid positive number.");
      return;
    }
    setIsRecordingPayment(true);
    setPaymentError(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${id}`, {
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
      setCaseData(data.data);
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

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/cases/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch case");
        setCaseData(data.data);
        setNotes(data.data.notes || "");
        setInternalNotes(data.data.internalNotes || "");
        setSelectedStatus(data.data.status);
        setSelectedStage(data.data.stage || "intake");
        setNextCourtDate(data.data.nextCourtDate ? new Date(data.data.nextCourtDate).toISOString().split("T")[0] : "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  const handleUpdate = async () => {
    if (!caseData) return;
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // Only the sections this account may edit
        body: JSON.stringify({
          ...(canEdit ? { status: selectedStatus, stage: selectedStage, notes, nextCourtDate: nextCourtDate || undefined } : {}),
          ...(canEditConfidential ? { internalNotes } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setCaseData(data.data);
      setSaveMsg("Case updated successfully.");
      toast.success("Case updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setSaveMsg(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeatured = async () => {
    if (!caseData) return;
    setIsToggling(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/cases/${id}/toggle-featured`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update featured status");
      setCaseData((prev) => prev && { ...prev, isFeatured: data.data.isFeatured });
      toast.success(data.data.isFeatured ? "Case featured as a success story" : "Case removed from success stories");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update featured status");
    } finally {
      setIsToggling(false);
    }
  };

  const handleArchive = async () => {
    if (!caseData) return;
    const note = await askArchiveCase({
      caseNumber: caseData.caseNumber,
      title: caseData.title,
      restoreHint: "You can restore it later from the Archived tab.",
    });
    if (note === null) return;
    setIsArchiving(true);
    try {
      const { message, data } = await archiveCase<CaseDetail>(id, { note });
      setCaseData((prev) =>
        prev && {
          ...prev,
          isArchived: true,
          archivedAt: data.archivedAt,
          archivedBy: data.archivedBy,
          archiveReason: data.archiveReason,
          archiveNote: data.archiveNote,
        },
      );
      setIsEditingTotalPayment(false);
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive case");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async () => {
    if (!caseData) return;
    const confirmed = await confirmDialog({
      title: `Restore ${caseData.caseNumber}?`,
      message: "The case will return to your active cases and can be edited again.",
      confirmLabel: "Restore",
    });
    if (!confirmed) return;
    setIsArchiving(true);
    try {
      const { message } = await restoreCase(id);
      setCaseData((prev) =>
        prev && { ...prev, isArchived: false, archivedAt: null, archivedBy: null, archiveReason: null, archiveNote: undefined },
      );
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore case");
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-24 rounded bg-surface-container" />
        <div className="h-8 w-64 rounded bg-surface-container" />
        <div className="h-48 rounded-lg bg-surface-container" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <p className="text-error">{error || "Case not found."}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-link text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const fmt = (date: string) =>
    new Date(date).toLocaleDateString("en-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const isArchived = caseData.isArchived === true;
  const canRestore = canArchive && canLawyerRestore(caseData, workspace.lawyerId);
  const archiver = archivedByName(caseData);

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Cases
          </button>
          <h3 className="font-display text-2xl font-semibold text-heading">
            {caseData.title}
          </h3>
          <p className="font-mono text-xs text-on-surface-variant">
            {caseData.caseNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isArchived ? (
            canArchive && <button
              type="button"
              disabled={isArchiving}
              onClick={handleArchive}
              className="btn btn-secondary btn-sm"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          ) : canRestore ? (
            <button
              type="button"
              disabled={isArchiving}
              onClick={handleRestore}
              className="btn btn-secondary btn-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </button>
          ) : null}

          {canFeature ? (
            <button
              type="button"
              aria-label={caseData.isFeatured ? "Unfeature case" : "Feature case"}
              disabled={isToggling || isArchived}
              onClick={toggleFeatured}
              className="btn btn-secondary btn-sm"
            >
              {caseData.isFeatured ? (
                <>
                  <Star className="h-3.5 w-3.5 fill-secondary text-gold-ink" />
                  Featured
                </>
              ) : (
                <>
                  <StarOff className="h-3.5 w-3.5" />
                  Feature
                </>
              )}
            </button>
          ) : caseData.isFeatured ? (
            <span className="chip text-on-surface">
              <Star className="h-3.5 w-3.5 fill-secondary text-gold-ink" aria-hidden="true" />
              Featured
            </span>
          ) : null}

          <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[caseData.priority]}`}>
            {caseData.priority} priority
          </span>
          <span className={`inline-flex items-center rounded-md border border-current/15 px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[caseData.status]}`}>
            {caseData.status.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      {isArchived && (
        <div role="status" className="notice notice-info flex gap-3 p-4">
          <Archive className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-on-surface">
              This case was archived on {formatCaseDate(caseData.archivedAt)}
              {archiver ? ` by ${archiver}` : ""}.
            </p>
            <p className="text-on-surface-variant">
              It is read-only.{" "}
              {canRestore
                ? "Restore it to make changes."
                : canArchive
                  ? "It was archived by an administrator, so only an admin can restore it."
                  : ""}
            </p>
            {caseData.archiveNote && (
              <p className="text-on-surface-variant">
                <span className="font-medium text-on-surface">Note:</span> {caseData.archiveNote}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Case Description
            </h3>
            <RichText value={caseData.description} />
          </section>

          {/* Court info */}
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Court & Proceedings
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <InfoRow label="Court" value={caseData.courtName} />
              <InfoRow label="Jurisdiction" value={caseData.jurisdiction} />
              <InfoRow label="Case Type" value={caseData.type.replace(/-/g, " ")} />
              <InfoRow
                label="Filing Date"
                value={caseData.filingDate ? fmt(caseData.filingDate) : undefined}
              />
              <InfoRow
                label="Next Hearing"
                value={caseData.nextCourtDate ? fmt(caseData.nextCourtDate) : undefined}
                highlight
              />
              <InfoRow
                label="Mode"
                value={caseData.isOnline ? "Online" : "Offline"}
              />
            </div>
          </section>

          {/* Opposing party */}
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Opposing Party
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <InfoRow label="Opposing Party" value={caseData.opposingParty} />
              <InfoRow label="Opposing Counsel" value={caseData.opposingCounsel} />
            </div>
          </section>

          {/* Hearing History */}
          {caseData.hearingHistory && caseData.hearingHistory.length > 0 && (
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-on-surface">Hearing History</h3>
              <div className="space-y-3">
                {caseData.hearingHistory.map((h, i) => (
                  <div key={h._id || i} className="rounded-lg bg-surface p-3 text-sm">
                    <p className="font-medium text-on-surface">{fmt(h.date)}</p>
                    <p className="mt-1 text-on-surface-variant">{h.description}</p>
                    {h.outcome && <p className="mt-1 text-xs text-success">Outcome: {h.outcome}</p>}
                    {h.nextSteps && <p className="mt-1 text-xs text-gold-ink">Next: {h.nextSteps}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documents */}
          {caseData.documents && caseData.documents.length > 0 && (
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-on-surface">Documents</h3>
              <div className="space-y-2">
                {caseData.documents.map((d, i) => (
                  <div key={d._id || i} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-on-surface">{d.name}</p>
                      {d.documentType && <p className="text-xs text-on-surface-variant">{d.documentType}</p>}
                    </div>
                    <span className="chip capitalize">
                      {d.sharedVia}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Evidence & Witnesses */}
          {(caseData.evidenceSummary || (caseData.witnessNames && caseData.witnessNames.length > 0)) && (
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-on-surface">Evidence & Witnesses</h3>
              {caseData.witnessNames && caseData.witnessNames.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 text-xs font-medium text-on-surface-variant">Witnesses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {caseData.witnessNames.map((w, i) => (
                      <span key={i} className="chip text-on-surface">{w}</span>
                    ))}
                  </div>
                </div>
              )}
              {caseData.evidenceSummary && (
                <div>
                  <p className="mb-1 text-xs font-medium text-on-surface-variant">Evidence Summary</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{caseData.evidenceSummary}</p>
                </div>
              )}
            </section>
          )}

          {/* Payments & Financial History (finance permission; the API leaves the fields out otherwise) */}
          {canViewFinance && (
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Payments & Financial History</h3>
            
            {/* Add Payment Form (hidden while archived) */}
            {canEditFinance && !isArchived && (
            <form onSubmit={handleRecordPayment} className="mb-6 rounded-lg bg-surface p-4 border border-outline-variant/50">
              <h4 className="mb-2 text-sm font-semibold text-on-surface-variant">Record Offline Payment</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="pay-amount" className="mb-1 block text-xs font-semibold text-on-surface-variant">Amount (৳)</label>
                  <input
                    id="pay-amount"
                    type="number"
                    min="1"
                    placeholder="5000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="field field-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pay-date" className="mb-1 block text-xs font-semibold text-on-surface-variant">Payment Date</label>
                  <input
                    id="pay-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="field field-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pay-details" className="mb-1 block text-xs font-semibold text-on-surface-variant">Details</label>
                  <input
                    id="pay-details"
                    type="text"
                    placeholder="Cash / Bank / bkash reference"
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    className="field field-sm"
                  />
                </div>
              </div>
              {paymentError && <p className="mt-2 text-xs text-error">{paymentError}</p>}
              <button
                type="submit"
                disabled={isRecordingPayment}
                className="btn btn-primary btn-sm mt-3"
              >
                {isRecordingPayment ? "Recording..." : "Record Payment"}
              </button>
            </form>
            )}

            {/* Payments List */}
            <div className="space-y-2">
              {!caseData.payments || caseData.payments.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">No payments recorded yet.</p>
              ) : (
                <div className="panel overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container font-semibold text-on-surface-variant">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Details</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 bg-surface">
                      {caseData.payments.map((p) => (
                        <tr key={p._id} className="text-on-surface">
                          <td className="px-3 py-2 whitespace-nowrap">{fmt(p.date)}</td>
                          <td className="px-3 py-2">{p.details || "—"}</td>
                          <td className="px-3 py-2 text-right font-medium text-success">৳{p.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
          )}

          {/* Update Case (archived cases are read-only) */}
          {!isArchived && (canEdit || canEditConfidential) && (
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Update Case</h3>
            <div className="space-y-3">
              {canEdit && (<>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="status-select" className="label">Status</label>
                  <select
                    id="status-select"
                    title="Case Status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                    className="field"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stage-select" className="label">Stage</label>
                  <select
                    id="stage-select"
                    title="Case Stage"
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="field"
                  >
                    {["intake","pre-filing","filed","pre-trial","trial","post-trial","appeal","enforcement","closed"].map((s) => (
                      <option key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="next-court" className="label">Next Hearing Date</label>
                <input
                  id="next-court"
                  type="date"
                  value={nextCourtDate}
                  onChange={(e) => setNextCourtDate(e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <p id="case-notes-label" className="label">Client-Visible Notes</p>
                <RichTextEditor
                  id="case-notes"
                  ariaLabelledBy="case-notes-label"
                  value={notes}
                  onChange={setNotes}
                  maxLength={CASE_NOTES_MAX}
                  minHeightClass="min-h-24"
                  placeholder="Notes visible to client..."
                />
              </div>
              </>)}
              {canEditConfidential && (
                <div>
                  <label htmlFor="internal-notes" className="label">Internal Notes (Lawyer Only)</label>
                  <textarea
                    id="internal-notes"
                    rows={3}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private notes not visible to client..."
                    className="field resize-none"
                  />
                </div>
              )}
              {saveMsg && (
                <p className={`text-sm ${saveMsg.includes("success") ? "text-success" : "text-error"}`}>
                  {saveMsg}
                </p>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleUpdate}
                className="btn btn-primary"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client info */}
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Client</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-on-surface">{caseData.clientName}</p>
              <p className="text-on-surface-variant">{caseData.clientEmail}</p>
              {(caseData.clientPhone || caseData.clientId?.phone) && (
                <p className="text-on-surface-variant">{caseData.clientPhone || caseData.clientId?.phone}</p>
              )}
              {caseData.clientWhatsapp && (
                <a
                  href={`https://wa.me/${caseData.clientWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                >
                  WhatsApp: {caseData.clientWhatsapp}
                </a>
              )}
              {caseData.caseOrigin && (
                <p className="text-xs text-on-surface-variant capitalize">Origin: {caseData.caseOrigin.replace(/-/g, " ")}</p>
              )}
              {caseData.referredBy && (
                <p className="text-xs text-on-surface-variant">Referred by: {caseData.referredBy}</p>
              )}
            </div>
          </section>

          {/* Case stage */}
          {caseData.stage && (
            <section className="card p-5">
              <h3 className="mb-2 text-sm font-semibold text-on-surface">Stage</h3>
              <span className="chip capitalize text-on-surface">
                {caseData.stage.replace(/-/g, " ")}
              </span>
              {caseData.statute && (
                <div className="mt-3">
                  <p className="text-xs text-on-surface-variant">Applicable Statute</p>
                  <p className="mt-0.5 text-sm text-on-surface">{caseData.statute}</p>
                </div>
              )}
            </section>
          )}

          {/* Financials */}
          {canViewFinance && (
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Financials</h3>
            <div className="space-y-3 text-sm">
              {/* Total Payment Edit */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-on-surface-variant font-medium">Total Payment</span>
                  {isEditingTotalPayment ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        title="Total Payment"
                        className="w-20 rounded px-1 py-0.5 text-xs"
                        value={tempTotalPayment}
                        onChange={(e) => setTempTotalPayment(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleSaveTotalPayment}
                        disabled={isSavingTotalPayment}
                        className="text-[10px] text-success hover:underline font-semibold"
                      >
                        {isSavingTotalPayment ? "..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTotalPayment(false)}
                        className="text-[10px] text-error hover:underline font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-on-surface">৳{(caseData.totalPayment || 0).toLocaleString()}</span>
                      {canEditFinance && !isArchived && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempTotalPayment(String(caseData.totalPayment || 0));
                            setIsEditingTotalPayment(true);
                          }}
                          className="text-link text-[10px]"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Calculated metrics */}
              <div className="flex justify-between border-t border-outline-variant/30 pt-2">
                <span className="text-on-surface-variant font-medium">Total Paid</span>
                <span className="font-semibold text-success">৳{totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-medium">Remaining</span>
                <span className={`font-bold ${remainingAmount > 0 ? "text-error" : "text-success"}`}>
                  ৳{remainingAmount.toLocaleString()}
                </span>
              </div>

              {/* Other existing fields if present */}
              {(caseData.caseValue || caseData.retainerAmount || caseData.estimatedFee || caseData.retainerPaid !== undefined) && (
                <div className="border-t border-outline-variant/30 pt-2 space-y-2">
                  {caseData.caseValue && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Case Value</span>
                      <span className="font-medium text-on-surface">৳{caseData.caseValue.toLocaleString()}</span>
                    </div>
                  )}
                  {caseData.retainerAmount && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Retainer</span>
                      <span className="font-medium text-on-surface">৳{caseData.retainerAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {caseData.estimatedFee && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Est. Fee</span>
                      <span className="font-medium text-on-surface">৳{caseData.estimatedFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Retainer Paid</span>
                    <span className={`text-xs font-semibold ${caseData.retainerPaid ? "text-success" : "text-error"}`}>
                      {caseData.retainerPaid ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
          )}

          {/* Timestamps */}
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-on-surface-variant">Created</p>
                <p className="text-on-surface">{fmt(caseData.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Last Updated</p>
                <p className="text-on-surface">{fmt(caseData.updatedAt)}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className={`mt-0.5 font-medium capitalize ${highlight ? "text-gold-ink" : "text-on-surface"}`}>
        {value}
      </p>
    </div>
  );
}
