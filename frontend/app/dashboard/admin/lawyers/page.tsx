"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import {
  Plus, X, Scale, ShieldCheck, ShieldOff, Trash2, Eye,
  Mail, Phone, BadgeCheck, Calendar, User, Briefcase,
  FileText, Clock, CheckCircle,
} from "lucide-react";

interface LawyerItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  barId?: string;
  specialization?: string;
  isVerified: boolean;
  passwordNeedsChange?: boolean;
  createdAt: string;
}

interface LawyerDetails extends LawyerItem {
  profileImageUrl?: string;
  updatedAt: string;
  stats: {
    totalCases: number;
    activeCases: number;
    totalConsultations: number;
  };
}

const EMPTY_FORM = { name: "", email: "", phone: "", barId: "", specialization: "" };

export default function AdminLawyersPage() {
  const [lawyers, setLawyers] = useState<LawyerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal
  const [detailsLawyer, setDetailsLawyer] = useState<LawyerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const fetchLawyers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lawyers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lawyers");
      const data = await res.json();
      setLawyers(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLawyers(); }, [fetchLawyers]);

  const openDetails = async (id: string) => {
    setDetailsLawyer(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lawyers/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lawyer details");
      const data = await res.json();
      setDetailsLawyer(data.data);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleVerification = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lawyers/${id}/toggle-verification`, {
        method: "PATCH", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update verification");
      const data = await res.json();
      setLawyers((prev) => prev.map((l) => l._id === id ? { ...l, isVerified: data.data.isVerified } : l));
      // Sync details modal if open
      if (detailsLawyer?._id === id) {
        setDetailsLawyer((prev) => prev ? { ...prev, isVerified: data.data.isVerified } : prev);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteLawyer = async (id: string, name: string) => {
    if (!confirm(`Remove lawyer "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lawyers/${id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove lawyer");
      setLawyers((prev) => prev.filter((l) => l._id !== id));
      if (detailsLawyer?._id === id) setDetailsLawyer(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name || !form.email || !form.phone || !form.barId) {
      setFormError("Name, email, phone, and Bar ID are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lawyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add lawyer");
      setShowModal(false);
      setForm(EMPTY_FORM);
      void fetchLawyers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add lawyer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            Lawyer Management
          </h3>
          <p className="text-sm text-on-surface-variant">
            Add and manage lawyer accounts. Lawyers are added by admin only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" />
          Add Lawyer
        </button>
      </header>

      {/* Stats */}
      {!isLoading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total Lawyers" value={lawyers.length} />
          <StatsCard label="Verified" value={lawyers.filter((l) => l.isVerified).length} />
          <StatsCard label="Unverified" value={lawyers.filter((l) => !l.isVerified).length} />
          <StatsCard label="Needs Password Change" value={lawyers.filter((l) => l.passwordNeedsChange).length} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-20 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</div>
      ) : lawyers.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center">
          <Scale className="mx-auto mb-3 h-8 w-8 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No lawyers yet. Click &ldquo;Add Lawyer&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lawyers.map((lawyer) => (
            <div key={lawyer._id} className="rounded-xl border border-outline-variant bg-surface-container p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-on-surface">{lawyer.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lawyer.isVerified ? "bg-green-500/10 text-green-700" : "bg-secondary/10 text-secondary"}`}>
                      {lawyer.isVerified ? "Verified" : "Pending"}
                    </span>
                    {lawyer.passwordNeedsChange && (
                      <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                        Password Change Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant">{lawyer.email}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                    {lawyer.barId && <span>Bar ID: {lawyer.barId}</span>}
                    {lawyer.phone && <span>{lawyer.phone}</span>}
                    {lawyer.specialization && <span className="capitalize">{lawyer.specialization}</span>}
                    <span>Added {fmt(lawyer.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View Details */}
                  <button
                    type="button"
                    title="View details"
                    onClick={() => openDetails(lawyer._id)}
                    className="flex items-center gap-1.5 rounded-lg border border-secondary/60 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary hover:text-on-primary transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </button>

                  {/* Toggle Verification */}
                  <button
                    type="button"
                    title={lawyer.isVerified ? "Remove verification" : "Verify lawyer"}
                    disabled={togglingId === lawyer._id}
                    onClick={() => toggleVerification(lawyer._id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${lawyer.isVerified ? "border-error/40 text-error hover:bg-error/10" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-on-primary"}`}
                  >
                    {lawyer.isVerified ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {togglingId === lawyer._id ? "Saving…" : lawyer.isVerified ? "Unverify" : "Verify"}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    title="Remove lawyer"
                    disabled={deletingId === lawyer._id}
                    onClick={() => deleteLawyer(lawyer._id, lawyer.name)}
                    className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:border-error/40 hover:bg-error/10 hover:text-error transition disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lawyer Details Modal ─────────────────────────────────── */}
      {(detailsLoading || detailsLawyer || detailsError) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-12 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-outline-variant bg-surface shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant p-5">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-on-surface">Lawyer Details</h3>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => { setDetailsLawyer(null); setDetailsError(null); }}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {detailsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-container" />
                  ))}
                </div>
              ) : detailsError ? (
                <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                  {detailsError}
                </div>
              ) : detailsLawyer ? (
                <div className="space-y-5">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-4">
                    {detailsLawyer.profileImageUrl ? (
                      <img
                        src={detailsLawyer.profileImageUrl}
                        alt={detailsLawyer.name}
                        className="h-16 w-16 rounded-full object-cover border-2 border-primary/30"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                        <span className="text-2xl font-bold text-primary">
                          {detailsLawyer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-on-surface">{detailsLawyer.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${detailsLawyer.isVerified ? "bg-green-500/10 text-green-700" : "bg-secondary/10 text-secondary"}`}>
                          {detailsLawyer.isVerified ? "Verified" : "Pending Verification"}
                        </span>
                        {detailsLawyer.passwordNeedsChange && (
                          <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                            Password Change Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact & Profile Info */}
                  <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Contact & Profile</p>
                    <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={detailsLawyer.email} />
                    <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={detailsLawyer.phone || "—"} />
                    <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Bar ID" value={detailsLawyer.barId || "—"} />
                    <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Specialization" value={detailsLawyer.specialization || "—"} />
                  </div>

                  {/* Stats */}
                  <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Activity Stats</p>
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat icon={<FileText className="h-4 w-4" />} label="Total Cases" value={detailsLawyer.stats.totalCases} />
                      <MiniStat icon={<CheckCircle className="h-4 w-4" />} label="Active Cases" value={detailsLawyer.stats.activeCases} />
                      <MiniStat icon={<Clock className="h-4 w-4" />} label="Consultations" value={detailsLawyer.stats.totalConsultations} />
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Account Info</p>
                    <DetailRow icon={<Calendar className="h-4 w-4" />} label="Joined" value={fmt(detailsLawyer.createdAt)} />
                    <DetailRow icon={<Calendar className="h-4 w-4" />} label="Last Updated" value={fmt(detailsLawyer.updatedAt)} />
                  </div>

                  {/* Quick actions from modal */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      disabled={togglingId === detailsLawyer._id}
                      onClick={() => toggleVerification(detailsLawyer._id)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${detailsLawyer.isVerified ? "border-error/40 text-error hover:bg-error/10" : "border-primary bg-primary text-on-primary hover:opacity-90"}`}
                    >
                      {detailsLawyer.isVerified ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      {togglingId === detailsLawyer._id ? "Saving…" : detailsLawyer.isVerified ? "Unverify" : "Verify"}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === detailsLawyer._id}
                      onClick={() => deleteLawyer(detailsLawyer._id, detailsLawyer.name)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-error/40 px-4 py-2 text-sm font-semibold text-error hover:bg-error/10 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === detailsLawyer._id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Lawyer Modal ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant p-5">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-secondary" />
                <h3 className="font-display text-lg font-semibold text-on-surface">Add New Lawyer</h3>
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
              <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2 text-xs text-on-surface-variant">
                A lawyer account will be created with default password{" "}
                <span className="font-mono font-semibold text-on-surface">123456</span>.
                The lawyer must change it on first login.
              </div>

              {formError && (
                <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{formError}</div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-on-surface-variant sm:col-span-2">
                  Full Name <span className="text-error">*</span>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="Lawyer's full name" />
                </label>
                <label className="block text-xs font-medium text-on-surface-variant sm:col-span-2">
                  Email Address <span className="text-error">*</span>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="lawyer@islamassociates.com" />
                </label>
                <label className="block text-xs font-medium text-on-surface-variant">
                  Phone Number <span className="text-error">*</span>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="+8801XXXXXXXXX" />
                </label>
                <label className="block text-xs font-medium text-on-surface-variant">
                  Bar ID <span className="text-error">*</span>
                  <input type="text" value={form.barId} onChange={(e) => setForm((f) => ({ ...f, barId: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="BC-XXXX" />
                </label>
                <label className="block text-xs font-medium text-on-surface-variant sm:col-span-2">
                  Specialization
                  <input type="text" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                    placeholder="e.g. Immigration & Corporate Law" />
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => { setShowModal(false); setFormError(null); setForm(EMPTY_FORM); }}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-primary hover:opacity-90 transition disabled:opacity-50">
                  {isSubmitting ? "Creating…" : "Create Lawyer Account"}
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
      <p className="mt-2 font-display text-3xl font-bold text-on-surface">{value}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-on-surface-variant shrink-0">{icon}</span>
      <span className="text-xs text-on-surface-variant w-24 shrink-0">{label}</span>
      <span className="text-sm text-on-surface font-medium truncate">{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface p-3 text-center border border-outline-variant/50">
      <div className="flex justify-center text-secondary mb-1">{icon}</div>
      <p className="text-xl font-bold text-on-surface">{value}</p>
      <p className="text-xs text-on-surface-variant mt-0.5">{label}</p>
    </div>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
