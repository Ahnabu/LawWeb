"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Briefcase,
  Calendar,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, getUserDetails, updateUser, type UserDetailsResponse } from "../../../../../lib/adminUsers";
import { BlockUserDialog } from "../_components/BlockUserDialog";
import { UserAvatar, UserStatusBadge, confirmAndDelete, confirmAndUnblock, performBlock } from "../_components/userActions";

const CASE_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600",
  filed: "bg-secondary/10 text-secondary",
  "hearing-scheduled": "bg-yellow-500/10 text-yellow-700",
  "under-review": "bg-purple-500/10 text-purple-600",
  closed: "bg-surface-container text-on-surface-variant",
  won: "bg-green-500/10 text-green-700",
  lost: "bg-error/10 text-error",
  settled: "bg-green-500/10 text-green-700",
  appealed: "bg-purple-500/10 text-purple-600",
};

const CONSULTATION_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600",
  rescheduled: "bg-yellow-500/10 text-yellow-700",
  completed: "bg-green-500/10 text-green-700",
  cancelled: "bg-error/10 text-error",
};

const humanize = (value?: string) => (value ? value.replace(/-/g, " ") : "—");

// Appointment dates are stored as UTC midnight of the calendar day
const formatDay = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary";

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
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-container" />
        <div className="h-40 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-20 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-4">
        <BackLink href="/dashboard/admin/users" label="Back to users" />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          <span>{error ?? "User not found"}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold hover:bg-error/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
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
      <section className="rounded-xl border border-outline-variant bg-surface-container p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar name={user.name} imageUrl={user.profileImageUrl} size="lg" />
            <div className="min-w-0">
              <h3 className="break-words font-display text-xl font-semibold text-on-surface sm:text-2xl">{user.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <UserStatusBadge user={user} />
                <span className="rounded-full border border-outline-variant px-2.5 py-0.5 text-xs font-semibold capitalize text-on-surface-variant">
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-secondary hover:text-secondary"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              )}
              {user.isBlocked ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleUnblock()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-600/40 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-500/10 disabled:opacity-40"
                >
                  <ShieldCheck className="h-4 w-4" /> Unblock
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setShowBlock(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 px-3 py-2 text-sm font-semibold text-error transition hover:bg-error/10 disabled:opacity-40"
                >
                  <Ban className="h-4 w-4" /> Block
                </button>
              )}
              {!isLawyer && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-error px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {user.isBlocked && (
          <div role="status" className="mt-4 flex gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
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
          <p className="mt-4 rounded-lg border border-outline-variant bg-surface p-3 text-sm text-on-surface-variant">
            Admin accounts cannot be edited, blocked or deleted from here.
          </p>
        )}

        {isLawyer && canManage && !isEditing && (
          <p className="mt-4 text-xs text-on-surface-variant">
            To edit or remove a lawyer, use{" "}
            <Link href="/dashboard/admin/lawyers" className="font-semibold text-secondary hover:underline">
              Lawyer Management
            </Link>
            .
          </p>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="mt-5 space-y-4 border-t border-outline-variant pt-4">
            {formError && (
              <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{formError}</div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium text-on-surface-variant">
                Full name <span className="text-error">*</span>
                <input
                  type="text"
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  required
                />
              </label>
              <label className="block text-xs font-medium text-on-surface-variant">
                Email <span className="text-error">*</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  required
                />
              </label>
              <label className="block text-xs font-medium text-on-surface-variant">
                Phone
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
              <p className="text-xs text-on-surface-variant">
                The user will log in with the new email address from now on. Existing cases keep the email they were created with.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface disabled:opacity-40"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-primary transition hover:opacity-90 disabled:opacity-60"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-outline-variant pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email">
              <a href={`mailto:${user.email}`} className="break-all hover:text-secondary">
                {user.email}
              </a>
              <span className={`ml-2 text-xs ${user.isVerified ? "text-green-700" : "text-secondary"}`}>
                {user.isVerified ? "verified" : "not verified"}
              </span>
            </InfoItem>
            <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone">
              {user.phone ? (
                <a href={`tel:${user.phone}`} className="hover:text-secondary">
                  {user.phone}
                </a>
              ) : (
                "—"
              )}
            </InfoItem>
            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Joined">
              {formatDate(user.createdAt, true)}
            </InfoItem>
            <InfoItem icon={<KeyRound className="h-4 w-4" />} label="Password last changed">
              {user.passwordChangedAt ? formatDate(user.passwordChangedAt, true) : "Never"}
            </InfoItem>
            <InfoItem icon={<Clock className="h-4 w-4" />} label="Profile updated">
              {formatDate(user.updatedAt, true)}
            </InfoItem>
            {isLawyer && (
              <InfoItem icon={<UserRound className="h-4 w-4" />} label="Bar ID / Specialization">
                {[user.barId, user.specialization].filter(Boolean).join(" · ") || "—"}
              </InfoItem>
            )}
          </dl>
        )}
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Cases" value={stats.totalCases} sub={stats.archivedCases ? `${stats.archivedCases} archived` : undefined} />
        <StatCard label="Open cases" value={stats.activeCases} />
        <StatCard label="Upcoming appointments" value={stats.upcomingConsultations} />
        <StatCard
          label="Appointments"
          value={stats.totalConsultations}
          sub={`${stats.completedConsultations} completed · ${stats.cancelledConsultations} cancelled`}
        />
      </div>

      {/* Cases */}
      <section className="space-y-3">
        <h4 className="flex items-center gap-2 font-display text-lg font-semibold text-on-surface">
          <Briefcase className="h-5 w-5 text-secondary" /> Cases
        </h4>
        {cases.length === 0 ? (
          <EmptyState text={isLawyer ? "No cases are assigned to this lawyer." : "No cases are linked to this client."} />
        ) : (
          <ul className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface">
            {cases.map((item) => (
              <li key={item._id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.caseNumber && <span className="font-mono text-xs text-secondary">{item.caseNumber}</span>}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                        CASE_STATUS_STYLES[item.status] ?? "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {humanize(item.status)}
                    </span>
                    {item.isArchived && (
                      <span className="rounded-full border border-outline-variant px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-words font-medium text-on-surface">{item.title}</p>
                  <p className="mt-0.5 text-xs capitalize text-on-surface-variant">
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
                <p className="shrink-0 text-xs text-on-surface-variant">Opened {formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Appointments */}
      <section className="space-y-3">
        <h4 className="flex items-center gap-2 font-display text-lg font-semibold text-on-surface">
          <Calendar className="h-5 w-5 text-secondary" /> Appointments
        </h4>
        {consultations.length === 0 ? (
          <EmptyState text="No appointments yet." />
        ) : (
          <ul className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface">
            {consultations.map((item) => {
              const counterpart = isLawyer ? item.clientId : item.lawyerId;
              return (
                <li key={item._id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                          CONSULTATION_STATUS_STYLES[item.status] ?? "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.consultationType && (
                        <span className="text-xs capitalize text-on-surface-variant">{humanize(item.consultationType)}</span>
                      )}
                    </div>
                    <p className="mt-1 break-words font-medium text-on-surface">{item.subject}</p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {isLawyer ? "Client" : "Lawyer"}: {counterpart?.name ?? "Account removed"}
                      {item.meetingMode ? ` · ${humanize(item.meetingMode)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-on-surface sm:text-right">
                    {formatDay(item.date)}
                    <span className="block font-normal text-on-surface-variant">{item.time}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BlockUserDialog user={showBlock ? user : null} onConfirm={handleBlockConfirm} onClose={() => setShowBlock(false)} />
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant transition hover:text-secondary">
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}

function InfoItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-on-surface">{children}</dd>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container p-4">
      <p className="text-xs text-on-surface-variant sm:text-sm">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold text-on-surface sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container p-6 text-center text-sm text-on-surface-variant">{text}</div>
  );
}
