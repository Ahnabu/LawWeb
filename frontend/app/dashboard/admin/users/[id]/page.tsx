"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Loader2,
  Pencil,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, getUserDetails, updateUser, type UserDetailsResponse } from "../../../../../lib/adminUsers";
import { BlockUserDialog } from "../_components/BlockUserDialog";
import { RecentActivity } from "../_components/RecentActivity";
import { UserAvatar, UserStatusBadge, confirmAndDelete, confirmAndUnblock, performBlock } from "../_components/userActions";

// Status chips are neutral with a small coloured dot
const CASE_STATUS_DOTS: Record<string, string> = {
  active: "bg-sky-600",
  filed: "bg-secondary",
  "hearing-scheduled": "bg-secondary",
  "under-review": "bg-sky-600",
  closed: "bg-outline",
  won: "bg-success",
  lost: "bg-error",
  settled: "bg-success",
  appealed: "bg-secondary",
};

const CONSULTATION_STATUS_DOTS: Record<string, string> = {
  scheduled: "bg-sky-600",
  rescheduled: "bg-secondary",
  completed: "bg-success",
  cancelled: "bg-error",
};

const humanize = (value?: string) => (value ? value.replace(/-/g, " ") : "—");

// Appointment dates are stored as UTC midnight of the calendar day
const formatDay = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

const inputClass = "field";

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [details, setDetails] = useState<UserDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isBusy, setIsBusy] = useState(false);
  const [showBlock, setShowBlock] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!id) return;
      if (!quiet) setIsLoading(true);
      setError(null);
      try {
        setDetails(await getUserDetails(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user details");
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-6 w-40 rounded bg-surface-container" />
        <div className="card h-48 bg-surface-container" />
        <div className="card h-20 bg-surface-container" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-4">
        <BackLink href="/dashboard/admin/users" label="Back to users" />
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error ?? "User not found"}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="btn btn-secondary btn-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, cases, consultations, stats } = details;
  const isAdmin = user.role === "admin";
  const isLawyer = user.role === "lawyer";
  const canManage = !isAdmin;
  const backHref = isLawyer ? "/dashboard/admin/lawyers" : "/dashboard/admin/users";

  const startEdit = () => {
    setForm({ name: user.name, email: user.email, phone: user.phone ?? "" });
    setFormError(null);
    setIsEditing(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload: { name?: string; email?: string; phone?: string } = {};
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (name !== user.name) payload.name = name;
    if (email !== user.email) payload.email = email;
    if (phone !== (user.phone ?? "")) payload.phone = phone;

    if (name.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateUser(user._id, payload);
      setDetails((current) => (current ? { ...current, user: { ...current.user, ...result.data } } : current));
      setIsEditing(false);
      toast.success(result.message || "User updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const applyBlockState = (state: { isBlocked: boolean; blockedAt: string | null; blockedReason: string | null }) =>
    setDetails((current) =>
      current ? { ...current, user: { ...current.user, isBlocked: state.isBlocked, blockedAt: state.blockedAt, blockedReason: state.blockedReason } } : current,
    );

  const handleBlockConfirm = async (reason: string) => {
    const state = await performBlock(user, reason);
    if (state) {
      applyBlockState(state);
      setShowBlock(false);
    }
  };

  const handleUnblock = async () => {
    setIsBusy(true);
    const state = await confirmAndUnblock(user);
    setIsBusy(false);
    if (state) applyBlockState(state);
  };

  const handleDelete = async () => {
    setIsBusy(true);
    const deleted = await confirmAndDelete(user, stats);
    setIsBusy(false);
    if (deleted) router.replace("/dashboard/admin/users");
  };

  return (
    <div className="space-y-6">
      <BackLink href={backHref} label={isLawyer ? "Back to lawyers" : "Back to users"} />

      {/* Profile */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar name={user.name} imageUrl={user.profileImageUrl} size="lg" />
            <div className="min-w-0">
              <h3 className="break-words font-display text-xl font-semibold text-on-surface sm:text-2xl">{user.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <UserStatusBadge user={user} />
                <span className="chip capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {canManage && !isEditing && (
            <div className="flex flex-wrap gap-2">
              {/* Lawyers are edited in Lawyer Management, which also syncs their public profile */}
              {!isLawyer && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="btn btn-secondary btn-sm"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                </button>
              )}
              {user.isBlocked ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleUnblock()}
                  className="btn btn-secondary btn-sm"
                >
                  <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" /> Unblock
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setShowBlock(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Ban className="h-4 w-4 text-error" aria-hidden="true" /> Block
                </button>
              )}
              {!isLawyer && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDelete()}
                  className="btn btn-ghost btn-sm hover:text-error"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {user.isBlocked && (
          <div role="status" className="notice notice-error mt-5 flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">Blocked{user.blockedAt ? ` on ${formatDate(user.blockedAt, true)}` : ""}</p>
              <p className="mt-0.5 break-words text-error/90">
                {user.blockedReason ? `Reason: ${user.blockedReason}` : "No reason was recorded."}
              </p>
              <p className="mt-1 text-xs text-error/80">This account cannot log in or reset its password until it is unblocked.</p>
            </div>
          </div>
        )}

        {isAdmin && (
          <p className="notice mt-5 text-on-surface-variant">
            Admin accounts cannot be edited, blocked or deleted from here.
          </p>
        )}

        {isLawyer && canManage && !isEditing && (
          <p className="mt-4 text-sm text-on-surface-variant">
            To edit or remove a lawyer, use{" "}
            <Link href="/dashboard/admin/lawyers" className="text-link">
              Lawyer Management
            </Link>
            .
          </p>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="mt-5 space-y-5 border-t border-outline-variant pt-5">
            {formError && (
              <p className="notice notice-error" role="alert">{formError}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="label">Full name <span className="text-error">*</span></span>
                <input
                  type="text"
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  required
                />
              </label>
              <label className="block">
                <span className="label">Email <span className="text-error">*</span></span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  required
                />
              </label>
              <label className="block">
                <span className="label">Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="+8801…"
                />
              </label>
            </div>
            {form.email.trim().toLowerCase() !== user.email && (
              <p className="notice notice-info">
                The user will log in with the new email address from now on. Existing cases keep the email they were created with.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-outline-variant pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Email">
              <a href={`mailto:${user.email}`} className="break-all hover:text-gold-ink">
                {user.email}
              </a>
              <span className={`ml-2 text-xs ${user.isVerified ? "text-success" : "text-gold-ink"}`}>
                {user.isVerified ? "verified" : "not verified"}
              </span>
            </InfoItem>
            <InfoItem label="Phone">
              {user.phone ? (
                <a href={`tel:${user.phone}`} className="hover:text-gold-ink">
                  {user.phone}
                </a>
              ) : (
                "—"
              )}
            </InfoItem>
            <InfoItem label="Joined">
              {formatDate(user.createdAt, true)}
            </InfoItem>
            <InfoItem label="Password last changed">
              {user.passwordChangedAt ? formatDate(user.passwordChangedAt, true) : "Never"}
            </InfoItem>
            <InfoItem label="Profile updated">
              {formatDate(user.updatedAt, true)}
            </InfoItem>
            {isLawyer && (
              <InfoItem label="Bar ID / Specialization">
                {[user.barId, user.specialization].filter(Boolean).join(" · ") || "—"}
              </InfoItem>
            )}
          </dl>
        )}
      </section>

      {/* Stats */}
      <dl className="card grid grid-cols-2 gap-px overflow-hidden bg-outline-variant lg:grid-cols-4">
        <StatCard label="Cases" value={stats.totalCases} sub={stats.archivedCases ? `${stats.archivedCases} archived` : undefined} />
        <StatCard label="Open cases" value={stats.activeCases} />
        <StatCard label="Upcoming appointments" value={stats.upcomingConsultations} />
        <StatCard
          label="Appointments"
          value={stats.totalConsultations}
          sub={`${stats.completedConsultations} completed · ${stats.cancelledConsultations} cancelled`}
        />
      </dl>

      {/* Cases */}
      <section className="space-y-3">
        <h4 className="font-display text-lg font-semibold text-on-surface">
          Cases
        </h4>
        {cases.length === 0 ? (
          <EmptyState text={isLawyer ? "No cases are assigned to this lawyer." : "No cases are linked to this client."} />
        ) : (
          <ul className="card divide-y divide-outline-variant overflow-hidden">
            {cases.map((item) => (
              <li key={item._id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.caseNumber && <span className="font-mono text-xs text-gold-ink">{item.caseNumber}</span>}
                    <span className="chip capitalize">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CASE_STATUS_DOTS[item.status] ?? "bg-outline"}`} />
                      {humanize(item.status)}
                    </span>
                    {item.isArchived && (
                      <span className="chip">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-words font-medium text-on-surface">{item.title}</p>
                  <p className="mt-0.5 text-sm capitalize text-on-surface-variant">
                    {humanize(item.type)}
                    {isLawyer
                      ? item.clientName
                        ? ` · Client: ${item.clientName}`
                        : ""
                      : item.lawyerId?.name
                        ? ` · Lawyer: ${item.lawyerId.name}`
                        : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-on-surface-variant">Opened {formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Appointments */}
      <section className="space-y-3">
        <h4 className="font-display text-lg font-semibold text-on-surface">
          Appointments
        </h4>
        {consultations.length === 0 ? (
          <EmptyState text="No appointments yet." />
        ) : (
          <ul className="card divide-y divide-outline-variant overflow-hidden">
            {consultations.map((item) => {
              const counterpart = isLawyer ? item.clientId : item.lawyerId;
              return (
                <li key={item._id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip capitalize">
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CONSULTATION_STATUS_DOTS[item.status] ?? "bg-outline"}`} />
                        {item.status}
                      </span>
                      {item.consultationType && (
                        <span className="text-sm capitalize text-on-surface-variant">{humanize(item.consultationType)}</span>
                      )}
                    </div>
                    <p className="mt-1 break-words font-medium text-on-surface">{item.subject}</p>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      {isLawyer ? "Client" : "Lawyer"}: {counterpart?.name ?? "Account removed"}
                      {item.meetingMode ? ` · ${humanize(item.meetingMode)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-on-surface sm:text-right">
                    {formatDay(item.date)}
                    <span className="block font-normal text-on-surface-variant">{item.time}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RecentActivity userId={user._id} userName={user.name} />

      <BlockUserDialog user={showBlock ? user : null} onConfirm={handleBlockConfirm} onClose={() => setShowBlock(false)} />
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn btn-ghost btn-sm -ml-3">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="mt-0.5 text-sm text-on-surface">{children}</dd>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-surface-raised px-4 py-4 sm:px-5">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-bold text-on-surface tabular-nums">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-on-surface-variant">{sub}</dd>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card p-6 text-center text-sm text-on-surface-variant">{text}</div>
  );
}
