"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import { Plus, X, Briefcase, ChevronDown } from "lucide-react";

interface LawyerOption {
  _id: string;
  name: string;
  barId?: string;
}

interface IPayment {
  _id: string;
  amount: number;
  date: string;
  details?: string;
}

interface CaseItem {
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
  lawyerId?: { _id: string; name?: string; email?: string; barId?: string };
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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600",
  filed: "bg-secondary/10 text-secondary",
  "hearing-scheduled": "bg-yellow-500/10 text-yellow-700",
  "under-review": "bg-purple-500/10 text-purple-600",
  closed: "bg-surface text-on-surface-variant",
  won: "bg-green-500/10 text-green-700",
  lost: "bg-error/10 text-error",
};

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update total payment");
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
      const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
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
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (caseId: string, paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment entry?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete payment");
    }
  };

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_BASE_URL}/api/admin/cases${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch cases");
      const data = await res.json();
      setCases(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const fetchLawyers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lawyers`, {
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

  const updateCaseStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setCases((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
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
      const res = await fetch(`${API_BASE_URL}/api/admin/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create case");
      setShowModal(false);
      setForm(EMPTY_FORM);
      void fetchCases();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusFilters = ["all", ...CASE_STATUSES];

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "active").length,
    won: cases.filter((c) => c.status === "won").length,
    closed: cases.filter((c) => c.status === "closed").length,
  };

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
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" />
          Add Case
        </button>
      </header>

      {/* Stats */}
      {!isLoading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total Cases" value={stats.total} />
          <StatsCard label="Active Cases" value={stats.active} />
          <StatsCard label="Won Cases" value={stats.won} />
          <StatsCard label="Closed Cases" value={stats.closed} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
              statusFilter === s
                ? "bg-primary text-on-primary"
                : "border border-outline-variant bg-surface text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {s.replace("-", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="h-24 animate-pulse rounded-xl border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          No cases found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <div
              key={item._id}
              className="rounded-xl border border-outline-variant bg-surface-container overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {item.caseNumber && (
                      <span className="text-xs font-mono text-secondary">{item.caseNumber}</span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        STATUS_COLORS[item.status] ?? "bg-surface text-on-surface"
                      }`}
                    >
                      {item.status.replace("-", " ")}
                    </span>
                    <span className="rounded-full border border-outline-variant px-2.5 py-0.5 text-xs text-on-surface-variant capitalize">
                      {item.type.replace("-", " ")}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.isOnline ? "bg-green-500/10 text-green-700" : "bg-secondary/10 text-secondary"}`}>
                      {item.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <p className="font-semibold text-on-surface truncate">{item.title}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Client: {item.clientName} &middot; Lawyer:{" "}
                    {item.lawyerId?.name || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleExpand(item._id)}
                  className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:bg-surface transition shrink-0"
                  aria-label="Toggle details"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedId === item._id ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {expandedId === item._id && (
                <div className="border-t border-outline-variant bg-surface p-4 space-y-4">
                  <p className="text-sm text-on-surface">{item.description}</p>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Client Email</p>
                      <p className="mt-0.5 text-on-surface">{item.clientEmail}</p>
                    </div>
                    {item.lawyerId?.barId && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Lawyer Bar ID</p>
                        <p className="mt-0.5 text-on-surface">{item.lawyerId.barId}</p>
                      </div>
                    )}
                    {item.nextCourtDate && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Next Court Date</p>
                        <p className="mt-0.5 text-on-surface">
                          {new Date(item.nextCourtDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Added</p>
                      <p className="mt-0.5 text-on-surface">
                        {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {item.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Notes</p>
                      <p className="mt-1 text-sm text-on-surface">{item.notes}</p>
                    </div>
                  )}

                  {/* Financials & Payments Section */}
                  <div className="border-t border-outline-variant/65 pt-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Financials & Payments</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Column 1: Summary */}
                      <div className="rounded-lg bg-surface-container-low p-4 border border-outline-variant/30 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-on-surface-variant font-medium">Total Payment:</span>
                          {isEditingTotalPayment === item._id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                title="Edit Total Payment"
                                className="w-20 rounded border border-outline bg-surface px-1 py-0.5 text-xs text-on-surface focus:outline-none"
                                value={tempTotalPayment}
                                onChange={(e) => setTempTotalPayment(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateTotalPayment(item._id, Number(tempTotalPayment))}
                                disabled={isSavingTotalPayment}
                                className="text-xs text-success hover:underline font-semibold"
                              >
                                {isSavingTotalPayment ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingTotalPayment(null)}
                                className="text-xs text-error hover:underline font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-on-surface">৳{(item.totalPayment || 0).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempTotalPayment(String(item.totalPayment || 0));
                                  setIsEditingTotalPayment(item._id);
                                }}
                                className="text-[10px] text-primary hover:underline font-semibold"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-sm border-t border-outline-variant/20 pt-2">
                          <span className="text-on-surface-variant">Total Paid:</span>
                          <span className="font-semibold text-success">
                            ৳{(item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">Remaining Balance:</span>
                          <span className={`font-bold ${Math.max(0, (item.totalPayment || 0) - (item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) > 0 ? "text-error" : "text-success"}`}>
                            ৳{Math.max(0, (item.totalPayment || 0) - (item.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Column 2: Record Payment */}
                      <form onSubmit={(e) => handleRecordPayment(e, item._id)} className="rounded-lg bg-surface-container-low p-4 border border-outline-variant/30 space-y-2">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Record Offline Payment</h5>
                        <div className="grid gap-2 grid-cols-2">
                          <div>
                            <label htmlFor={`pay-amount-${item._id}`} className="block text-[10px] text-on-surface-variant">Amount (৳)</label>
                            <input
                              id={`pay-amount-${item._id}`}
                              type="number"
                              min="1"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="Amount"
                              className="w-full rounded border border-outline bg-surface px-2 py-1 text-xs text-on-surface focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor={`pay-date-${item._id}`} className="block text-[10px] text-on-surface-variant">Date</label>
                            <input
                              id={`pay-date-${item._id}`}
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className="w-full rounded border border-outline bg-surface px-2 py-1 text-xs text-on-surface focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`pay-details-${item._id}`} className="block text-[10px] text-on-surface-variant">Details</label>
                          <input
                            id={`pay-details-${item._id}`}
                            type="text"
                            value={paymentDetails}
                            onChange={(e) => setPaymentDetails(e.target.value)}
                            placeholder="e.g. Cash / Bank transfer"
                            className="w-full rounded border border-outline bg-surface px-2 py-1 text-xs text-on-surface focus:outline-none"
                          />
                        </div>
                        {paymentError && <p className="text-[10px] text-error">{paymentError}</p>}
                        <button
                          type="submit"
                          disabled={isRecordingPayment}
                          className="w-full rounded bg-secondary py-1 text-xs font-semibold text-on-secondary hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {isRecordingPayment ? "Recording..." : "Record Payment"}
                        </button>
                      </form>
                    </div>

                    {/* Payment History List */}
                    <div className="space-y-1">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Payment History Logs</h5>
                      {!item.payments || item.payments.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">No payments recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto rounded border border-outline-variant/40 bg-surface">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-semibold">
                                <th className="px-3 py-1.5">Date</th>
                                <th className="px-3 py-1.5">Details</th>
                                <th className="px-3 py-1.5 text-right">Amount</th>
                                <th className="px-3 py-1.5 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/20">
                              {item.payments.map((p) => (
                                <tr key={p._id} className="text-on-surface">
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    {new Date(p.date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                                  </td>
                                  <td className="px-3 py-1.5">{p.details || "—"}</td>
                                  <td className="px-3 py-1.5 text-right font-medium text-success">
                                    ৳{p.amount.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(item._id, p._id)}
                                      className="text-error hover:underline text-[11px] font-medium"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status update */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <p className="w-full text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Update Status</p>
                    {CASE_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={item.status === s || updatingId === item._id}
                        onClick={() => updateCaseStatus(item._id, s)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition disabled:opacity-40 ${
                          item.status === s
                            ? "border-primary bg-primary/10 text-primary cursor-default"
                            : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                        }`}
                      >
                        {updatingId === item._id ? "Saving…" : s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-outline-variant bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant p-5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-secondary" />
                <h3 className="font-display text-lg font-semibold text-on-surface">Add New Case</h3>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => { setShowModal(false); setFormError(null); setForm(EMPTY_FORM); }}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
                  {formError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-on-surface-variant sm:col-span-2">
                  Case Title <span className="text-error">*</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="Brief case title"
                  />
                </label>

                <label className="block text-xs font-medium text-on-surface-variant">
                  Client Name <span className="text-error">*</span>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="Full name"
                  />
                </label>

                <label className="block text-xs font-medium text-on-surface-variant">
                  Client Email <span className="text-error">*</span>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="client@email.com"
                  />
                </label>

                <label className="block text-xs font-medium text-on-surface-variant">
                  Assign Lawyer <span className="text-error">*</span>
                  <select
                    value={form.lawyerId}
                    onChange={(e) => setForm((f) => ({ ...f, lawyerId: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="">Select lawyer</option>
                    {lawyers.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}{l.barId ? ` (${l.barId})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-on-surface-variant">
                  Case Type <span className="text-error">*</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                  >
                    {CASE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-on-surface-variant sm:col-span-2">
                  Description <span className="text-error">*</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary resize-none"
                    placeholder="Describe the case..."
                  />
                </label>

                <label className="block text-xs font-medium text-on-surface-variant">
                  Next Court Date
                  <input
                    type="date"
                    value={form.nextCourtDate}
                    onChange={(e) => setForm((f) => ({ ...f, nextCourtDate: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-on-surface-variant self-end pb-2">
                  <input
                    type="checkbox"
                    checked={form.isOnline}
                    onChange={(e) => setForm((f) => ({ ...f, isOnline: e.target.checked }))}
                    className="rounded"
                  />
                  Online Case
                </label>

                <label className="block text-xs font-medium text-on-surface-variant sm:col-span-2">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary resize-none"
                    placeholder="Additional notes..."
                  />
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); setForm(EMPTY_FORM); }}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating…" : "Create Case"}
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
