"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import { DelegationDialog } from "../../../../components/DelegationDialog";
import { Pagination } from "../../../../components/Pagination";
import { UserAvatar } from "../../admin/users/_components/userActions";
import { getPermissionCatalog, type CatalogPermission } from "../../../../lib/adminAccess";
import { summarizePermissions } from "../../../../lib/delegation";
import {
  getTeam,
  getTeamActivity,
  inviteAssistant,
  removeAssistant,
  updateAssistant,
  type TeamActivityEntry,
  type TeamMember,
} from "../../../../lib/workspace";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-()]*$/;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Dialog = { kind: "add" } | { kind: "edit"; member: TeamMember } | null;

// A lawyer's assistants: who may act for them, with what permissions, and what
// they did. Accounts themselves (block, delete) stay with the firm administrator.
export default function LawyerTeamPage() {
  const [tab, setTab] = useState<"assistants" | "activity">("assistants");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [catalog, setCatalog] = useState<CatalogPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    try {
      const [members, permissionCatalog] = await Promise.all([getTeam(), getPermissionCatalog()]);
      setTeam(members);
      const delegable = new Set(permissionCatalog.delegable);
      setCatalog(permissionCatalog.permissions.filter((p) => delegable.has(p.key)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load your team");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (member: TeamMember) => {
    const confirmed = await confirmDialog({
      title: `Remove ${member.name}?`,
      message: `${member.name} will no longer see or change your appointments, cases, availability or profile. Their account stays; the firm administrator manages accounts.`,
      confirmLabel: "Remove assistant",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const { message } = await removeAssistant(member.staffId);
      setTeam((prev) => prev.filter((m) => m.staffId !== member.staffId));
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the assistant");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-2xl font-semibold text-heading">My Team</h3>
          <p className="text-sm text-on-surface-variant">
            Assistants act on your behalf. Clients always see your name.
          </p>
        </div>
        <button type="button" onClick={() => setDialog({ kind: "add" })} disabled={isLoading} className="btn btn-primary">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add assistant
        </button>
      </header>

      <div role="tablist" aria-label="My team" className="panel flex w-full gap-1 p-1 sm:w-fit">
        {([
          ["assistants", "Assistants", Users],
          ["activity", "Team activity", History],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 min-h-9 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:flex-none ${
              tab === value
                ? "bg-surface-raised font-semibold text-on-surface shadow-[inset_0_1px_0_var(--highlight),0_1px_2px_rgb(16_24_40/0.12)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "activity" ? (
        <TeamActivity />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-container" />
          ))}
        </div>
      ) : team.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-on-surface-variant">
          No assistants yet.{" "}
          <button type="button" onClick={() => setDialog({ kind: "add" })} className="text-link">
            Add your first assistant.
          </button>
        </div>
      ) : (
        <ul className="card divide-y divide-outline-variant">
          {team.map((member) => (
            <li key={member.staffId} className="flex flex-wrap items-center gap-3 p-4">
              <UserAvatar name={member.name} imageUrl={member.profileImageUrl ?? undefined} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface">
                  {member.name}
                  {member.isBlocked && <span className="chip ml-2 text-error">Blocked by the firm</span>}
                </p>
                <p className="truncate text-sm text-on-surface-variant">
                  {member.email}
                  {member.phone ? ` · ${member.phone}` : ""}
                </p>
                <p className="mt-0.5 text-sm text-on-surface">{summarizePermissions(member.permissions)}</p>
                <p className="text-xs text-on-surface-variant">
                  Added {formatDate(member.createdAt)}
                  {member.grantedByRole === "admin" ? " by the firm administrator" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setDialog({ kind: "edit", member })} className="btn btn-ghost btn-sm">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button type="button" onClick={() => handleRemove(member)} className="btn btn-ghost btn-sm hover:text-error">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === "add" && (
        <AddAssistantDialog
          permissions={catalog}
          onClose={() => setDialog(null)}
          onAdded={(member) => {
            setTeam((prev) => [...prev.filter((m) => m.staffId !== member.staffId), member]);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "edit" && (
        <DelegationDialog
          title={`What ${dialog.member.name} can do`}
          permissions={catalog}
          initial={dialog.member.permissions}
          submitLabel="Save"
          onClose={() => setDialog(null)}
          onSubmit={async (permissions) => {
            const { message, data } = await updateAssistant(dialog.member.staffId, permissions);
            setTeam((prev) => prev.map((m) => (m.staffId === data.staffId ? data : m)));
            toast.success(message);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function AddAssistantDialog({
  permissions,
  onClose,
  onAdded,
}: {
  permissions: readonly CatalogPermission[];
  onClose: () => void;
  onAdded: (member: TeamMember) => void;
}) {
  const [form, setForm] = useState({ email: "", name: "", phone: "" });

  return (
    <DelegationDialog
      title="Add assistant"
      intro="If they don't have an account yet, we create one and email them a link to set their password. Existing firm staff are added straight away."
      permissions={permissions}
      initial={[]}
      submitLabel="Add assistant"
      onClose={onClose}
      onSubmit={async (selected) => {
        const email = form.email.trim();
        const name = form.name.trim();
        const phone = form.phone.trim();
        if (!EMAIL_PATTERN.test(email)) throw new Error("Enter a valid email address.");
        if (name && name.length < 2) throw new Error("Enter their full name.");
        if (phone && !PHONE_PATTERN.test(phone)) throw new Error("Enter a valid phone number.");
        // The API asks for the name only when the email is new to the firm
        const result = await inviteAssistant({ email, name: name || undefined, phone: phone || undefined, permissions: selected });
        if (result.emailSent === false) toast.warning(result.message);
        else toast.success(result.message);
        onAdded(result.data);
      }}
    >
      <label className="block">
        <span className="label">
          Email <span className="text-error">*</span>
        </span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          maxLength={254}
          className="field"
          autoFocus
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Full name</span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={100}
            className="field"
          />
          <span className="mt-1 block text-xs text-on-surface-variant">Needed if they&apos;re new to the firm</span>
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            maxLength={30}
            className="field"
          />
        </label>
      </div>
    </DelegationDialog>
  );
}

// What assistants did on this lawyer's behalf ("Sara confirmed the appointment…")
function TeamActivity() {
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<TeamActivityEntry[]>([]);
  const [meta, setMeta] = useState({ total: 0, limit: 20 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getTeamActivity(page)
      .then(({ data, meta: m }) => {
        setEntries(data);
        setMeta({ total: m.total, limit: m.limit });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load team activity"))
      .finally(() => setIsLoading(false));
  }, [page]);

  const lines = useMemo(
    () =>
      entries.map((entry) => {
        const summary = entry.summary.charAt(0).toLowerCase() + entry.summary.slice(1);
        // Summaries of changes to your profile or availability already name the assistant
        const text = entry.actorName && !entry.summary.startsWith(entry.actorName) ? `${entry.actorName} ${summary}` : entry.summary;
        return { ...entry, text };
      }),
    [entries],
  );

  if (isLoading && !entries.length) {
    return <div className="h-32 animate-pulse rounded-lg bg-surface-container" />;
  }
  if (!entries.length) {
    return <div className="panel p-8 text-center text-sm text-on-surface-variant">Nothing yet. Your assistants&apos; actions will appear here.</div>;
  }
  return (
    <div className="space-y-3">
      <ul className="card divide-y divide-outline-variant">
        {lines.map((entry) => (
          <li key={entry._id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="text-on-surface">{entry.text}</span>
            <time dateTime={entry.createdAt} className="whitespace-nowrap text-xs text-on-surface-variant">
              {formatDateTime(entry.createdAt)}
            </time>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={meta.limit} total={meta.total} onPageChange={setPage} disabled={isLoading} />
    </div>
  );
}
