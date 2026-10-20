"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "../../../../../components/ConfirmDialog";
import { formatDate } from "../../../../../lib/adminUsers";
import {
  blockStaff,
  deleteStaff,
  getPermissionCatalog,
  getStaffMember,
  listRoles,
  unblockStaff,
  updateStaff,
  type CatalogPermission,
  type StaffMember,
  type StaffRole,
} from "../../../../../lib/adminAccess";
import { BlockUserDialog } from "../../users/_components/BlockUserDialog";
import { UserAvatar, UserStatusBadge } from "../../users/_components/userActions";

const STAFF_BLOCK_CONSEQUENCES = [
  "They are signed out of every device immediately.",
  "They cannot log in or reset their password while blocked.",
  "Their role is kept. You can unblock them at any time.",
];

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export default function AdminStaffDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [member, setMember] = useState<StaffMember | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [catalog, setCatalog] = useState<CatalogPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleId, setRoleId] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showBlock, setShowBlock] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextMember, nextRoles, nextCatalog] = await Promise.all([
        getStaffMember(id),
        listRoles(),
        getPermissionCatalog().then((c) => c.permissions).catch(() => []),
      ]);
      setMember(nextMember);
      setRoleId(nextMember.staffRoleId?._id ?? "");
      setRoles(nextRoles);
      setCatalog(nextCatalog);
    } catch (err) {
      setError(errorText(err, "Failed to load staff member"));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Labels for what the chosen role allows (implied permissions are added at sign-in)
  const chosenRole = roles.find((r) => r._id === roleId) ?? null;
  const labelOf = useMemo(() => new Map(catalog.map((p) => [p.key, p.label])), [catalog]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-6 w-40 rounded bg-surface-container" />
        <div className="card h-48 bg-surface-container" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error ?? "Staff member not found"}</span>
          <button type="button" onClick={() => void load()} className="btn btn-secondary btn-sm">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const currentRoleId = member.staffRoleId?._id ?? "";
  const roleChanged = roleId !== currentRoleId;

  const saveRole = async () => {
    setIsSavingRole(true);
    try {
      const { data } = await updateStaff(member._id, { staffRoleId: roleId || null });
      setMember((prev) => (prev ? { ...prev, ...data, lastActiveAt: prev.lastActiveAt } : prev));
      toast.success(
        roleId ? `${member.name} is now ${chosenRole?.name ?? "in the new role"}. It applies on their next click.` : `${member.name} no longer has a role.`,
      );
    } catch (err) {
      toast.error(errorText(err, "Failed to change the role"));
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleBlockConfirm = async (reason: string) => {
    try {
      const { message, data } = await blockStaff(member._id, reason);
      setMember((prev) => (prev ? { ...prev, ...data } : prev));
      setShowBlock(false);
      toast.success(message || `${member.name} has been blocked.`);
    } catch (err) {
      toast.error(errorText(err, "Failed to block staff member"));
    }
  };

  const handleUnblock = async () => {
    const confirmed = await confirmDialog({
      title: `Unblock ${member.name}?`,
      message: "They will be able to sign in again with their current role.",
      confirmLabel: "Unblock",
    });
    if (!confirmed) return;
    setIsBusy(true);
    try {
      const { message, data } = await unblockStaff(member._id);
      setMember((prev) => (prev ? { ...prev, ...data } : prev));
      toast.success(message || `${member.name} has been unblocked.`);
    } catch (err) {
      toast.error(errorText(err, "Failed to unblock staff member"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: `Delete ${member.name}'s account?`,
      message: "This permanently removes the staff account and cannot be undone.",
      confirmLabel: "Delete account",
      tone: "danger",
      confirmPhrase: member.email,
      details: (
        <ul className="list-disc space-y-1 pl-5">
          <li>They are signed out everywhere and can no longer log in.</li>
          <li>The audit log keeps their name on everything they did.</li>
          <li>To pause access instead, block the account.</li>
        </ul>
      ),
    });
    if (!confirmed) return;
    setIsBusy(true);
    try {
      const { message } = await deleteStaff(member._id);
      toast.success(message || "Account deleted");
      router.replace("/dashboard/admin/team");
    } catch (err) {
      toast.error(errorText(err, "Failed to delete staff member"));
      setIsBusy(false);
    }
  };

  const details = [
    { label: "Email", value: member.email },
    { label: "Phone", value: member.phone || "Not added" },
    { label: "Added", value: formatDate(member.createdAt) },
    { label: "Last active", value: member.lastActiveAt ? formatDate(member.lastActiveAt, true) : "Not signed in" },
  ];

  return (
    <div className="space-y-6">
      <BackLink />

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar name={member.name} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-semibold text-on-surface">{member.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <UserStatusBadge user={member} />
                <span className="chip">{member.staffRoleId?.name ?? "No role"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {member.isBlocked ? (
              <button type="button" disabled={isBusy} onClick={() => void handleUnblock()} className="btn btn-secondary">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Unblock
              </button>
            ) : (
              <button type="button" disabled={isBusy} onClick={() => setShowBlock(true)} className="btn btn-secondary">
                <Ban className="h-4 w-4" aria-hidden="true" /> Block
              </button>
            )}
            <button type="button" disabled={isBusy} onClick={() => void handleDelete()} className="btn btn-ghost hover:text-error">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
            </button>
          </div>
        </div>

        {member.isBlocked && (
          <p className="notice notice-error mt-5">
            Blocked{member.blockedAt ? ` on ${formatDate(member.blockedAt)}` : ""}
            {member.blockedReason ? `: ${member.blockedReason}` : "."}
          </p>
        )}

        <dl className="panel mt-5 grid sm:grid-cols-2 lg:grid-cols-4">
          {details.map((item, index) => (
            <div
              key={item.label}
              className={`px-5 py-4 ${index > 0 ? "border-t border-outline-variant sm:border-t-0 sm:border-l" : ""}`}
            >
              <dt className="text-sm text-on-surface-variant">{item.label}</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-on-surface">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <div>
          <h4 className="font-display text-lg font-semibold text-on-surface">Role</h4>
          <p className="mt-1 text-sm text-on-surface-variant">
            Decides which admin pages they can use. A change applies on their next click; they don&apos;t need to sign in
            again.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="label">Role</span>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="field">
              <option value="">No role (no access)</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void saveRole()}
            disabled={!roleChanged || isSavingRole}
            className="btn btn-primary"
          >
            {isSavingRole && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSavingRole ? "Saving…" : "Save role"}
          </button>
        </div>
        {chosenRole ? (
          chosenRole.permissions.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={`What ${chosenRole.name} allows`}>
              {chosenRole.permissions.map((key) => (
                <li key={key} className="chip">
                  {labelOf.get(key) ?? key}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">This role has no permissions yet.</p>
          )
        ) : (
          <p className="text-sm text-on-surface-variant">Without a role they can sign in but see only an empty home page.</p>
        )}
        <p className="text-sm text-on-surface-variant">
          Edit what each role allows on the{" "}
          <Link href="/dashboard/admin/roles" className="text-link">
            Roles
          </Link>{" "}
          page.
        </p>
      </section>

      <BlockUserDialog
        user={showBlock ? member : null}
        consequences={STAFF_BLOCK_CONSEQUENCES}
        onConfirm={handleBlockConfirm}
        onClose={() => setShowBlock(false)}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/admin/team" className="text-link inline-flex items-center gap-1.5 text-sm">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to team
    </Link>
  );
}
