"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, StarOff } from "lucide-react";
import { API_BASE_URL } from "../../../../../lib/api";

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

interface CaseDetail {
  _id: string;
  caseNumber: string;
  title: string;
  description: string;
  type: string;
  status: CaseStatus;
  priority: CasePriority;
  clientName: string;
  clientEmail: string;
  clientId?: { name: string; email: string; phone?: string };
  isFeatured: boolean;
  isOnline: boolean;
  courtName?: string;
  jurisdiction?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  filingDate?: string;
  nextCourtDate?: string;
  notes?: string;
  lawyerId?: { name: string; email: string; barId?: string };
  createdAt: string;
  updatedAt: string;
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

const ALL_STATUSES: CaseStatus[] = [
  "active", "filed", "hearing-scheduled", "under-review",
  "closed", "won", "lost", "settled", "appealed",
];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>("active");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cases/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch case");
        setCaseData(data.data);
        setNotes(data.data.notes || "");
        setSelectedStatus(data.data.status);
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
      const res = await fetch(`${API_BASE_URL}/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: selectedStatus, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setCaseData(data.data);
      setSaveMsg("Case updated successfully.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeatured = async () => {
    if (!caseData) return;
    setIsToggling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${id}/toggle-featured`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCaseData((prev) => prev && { ...prev, isFeatured: data.data.isFeatured });
    } catch {
      // ignore
    } finally {
      setIsToggling(false);
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
          className="text-sm text-primary underline"
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

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Cases
          </button>
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            {caseData.title}
          </h3>
          <p className="font-mono text-xs text-on-surface-variant">
            {caseData.caseNumber}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={caseData.isFeatured ? "Unfeature case" : "Feature case"}
            disabled={isToggling}
            onClick={toggleFeatured}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors disabled:opacity-50"
          >
            {caseData.isFeatured ? (
              <>
                <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                Featured
              </>
            ) : (
              <>
                <StarOff className="h-3.5 w-3.5" />
                Feature
              </>
            )}
          </button>

          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${PRIORITY_COLORS[caseData.priority]}`}>
            {caseData.priority} priority
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[caseData.status]}`}>
            {caseData.status.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Case Description
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {caseData.description}
            </p>
          </section>

          {/* Court info */}
          <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
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
          <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Opposing Party
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <InfoRow label="Opposing Party" value={caseData.opposingParty} />
              <InfoRow label="Opposing Counsel" value={caseData.opposingCounsel} />
            </div>
          </section>

          {/* Update status + notes */}
          <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Update Case
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="status-select" className="mb-1 block text-xs font-medium text-on-surface-variant">
                  Status
                </label>
                <select
                  id="status-select"
                  title="Case Status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                  className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="case-notes" className="mb-1 block text-xs font-medium text-on-surface-variant">
                  Notes
                </label>
                <textarea
                  id="case-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this case..."
                  className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none resize-none"
                />
              </div>
              {saveMsg && (
                <p
                  className={`text-sm ${saveMsg.includes("success") ? "text-success" : "text-error"}`}
                >
                  {saveMsg}
                </p>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleUpdate}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client info */}
          <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Client
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-on-surface">{caseData.clientName}</p>
              <p className="text-on-surface-variant">{caseData.clientEmail}</p>
              {caseData.clientId?.phone && (
                <p className="text-on-surface-variant">{caseData.clientId.phone}</p>
              )}
            </div>
          </section>

          {/* Timestamps */}
          <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
            <h3 className="mb-3 text-sm font-semibold text-on-surface">
              Timeline
            </h3>
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
      <p className={`mt-0.5 font-medium capitalize ${highlight ? "text-secondary" : "text-on-surface"}`}>
        {value}
      </p>
    </div>
  );
}
