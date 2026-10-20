"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import {
  AccessApiError,
  createRole,
  deleteRole,
  getPermissionCatalog,
  impliedBy,
  listRoles,
  updateRole,
  type CatalogPermission,
  type PermissionCatalog,
  type StaffRole,
} from "../../../../lib/adminAccess";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Catalog permissions grouped in catalog order
function groupPermissions(permissions: readonly CatalogPermission[]) {
  const groups = new Map<string, CatalogPermission[]>();
  for (const permission of permissions) {
    groups.set(permission.group, [...(groups.get(permission.group) ?? []), permission]);
  }
  return [...groups.entries()];
}

type EditorState = { mode: "create" } | { mode: "edit"; role: StaffRole };

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [reassignTarget, setReassignTarget] = useState<StaffRole | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    try {
      const [nextRoles, nextCatalog] = await Promise.all([listRoles(), getPermissionCatalog()]);
      setRoles(nextRoles);
      setCatalog(nextCatalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (role: StaffRole) => {
    setRoles((prev) =>
      [...prev.filter((r) => r._id !== role._id), role].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditor(null);
  };

  const handleDelete = async (role: StaffRole) => {
    // Staff holding the role need somewhere to go first
    if (role.staffCount > 0) {
      setReassignTarget(role);
      return;
    }
    const confirmed = await confirmDialog({
      title: `Delete the ${role.name} role?`,
      message: "Nobody has this role, so no one loses access. This cannot be undone.",
      confirmLabel: "Delete role",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusyId(role._id);
    try {
      const { message } = await deleteRole(role._id);
      setRoles((prev) => prev.filter((r) => r._id !== role._id));
      toast.success(message || "Role deleted");
    } catch (err) {
      if (err instanceof AccessApiError && err.code === "ROLE_IN_USE") {
        // Someone was given the role since the list loaded
        const staffCount = Number(err.body.staffCount) || 1;
        setRoles((prev) => prev.map((r) => (r._id === role._id ? { ...r, staffCount } : r)));
        setReassignTarget({ ...role, staffCount });
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to delete role");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReassigned = (role: StaffRole, movedTo: string) => {
    setReassignTarget(null);
    setRoles((prev) =>
      prev
        .filter((r) => r._id !== role._id)
        .map((r) => (r._id === movedTo ? { ...r, staffCount: r.staffCount + role.staffCount } : r)),
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Roles</h3>
          <p className="text-sm text-on-surface-variant">
            A role is a set of permissions. Give each{" "}
            <Link href="/dashboard/admin/team" className="text-link">
              staff member
            </Link>{" "}
            one role; changes apply on their next click.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ mode: "create" })}
          disabled={!catalog}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New role
        </button>
      </header>

      {isLoading ? (
        <div className="card h-64 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="btn btn-secondary btn-sm">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : roles.length === 0 ? (
        <div className="card p-10 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-on-surface-variant" aria-hidden="true" />
          <p className="mt-3 text-sm text-on-surface-variant">
            No roles yet. Create one, or start from a template such as Receptionist or Content Editor.
          </p>
          <button type="button" onClick={() => setEditor({ mode: "create" })} className="btn btn-secondary btn-sm mt-4">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New role
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant bg-surface-container">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-on-surface-variant sm:px-4">Role</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-on-surface-variant sm:table-cell">Permissions</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-on-surface-variant sm:table-cell">Staff</th>
                <th className="px-3 py-3 text-right font-semibold text-on-surface-variant sm:px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {roles.map((role) => (
                <tr key={role._id} className={busyId === role._id ? "opacity-60" : ""}>
                  <td className="px-3 py-3.5 sm:px-4">
                    <p className="font-semibold text-on-surface">{role.name}</p>
                    {role.description && <p className="mt-0.5 text-on-surface-variant">{role.description}</p>}
                    <p className="mt-0.5 text-xs text-on-surface-variant sm:hidden">
                      {plural(role.permissions.length, "permission")} · {plural(role.staffCount, "staff member")}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-on-surface-variant sm:table-cell">
                    {role.permissions.length}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-on-surface-variant sm:table-cell">{role.staffCount}</td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setEditor({ mode: "edit", role })}
                        disabled={!catalog}
                        title="Edit"
                        aria-label={`Edit ${role.name}`}
                        className="btn btn-ghost btn-icon"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(role)}
                        disabled={busyId === role._id}
                        title="Delete"
                        aria-label={`Delete ${role.name}`}
                        className="btn btn-ghost btn-icon hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor && catalog && (
        <RoleEditor
          key={editor.mode === "edit" ? editor.role._id : "new"}
          role={editor.mode === "edit" ? editor.role : null}
          catalog={catalog}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}

      {reassignTarget && (
        <ReassignDialog
          role={reassignTarget}
          others={roles.filter((r) => r._id !== reassignTarget._id)}
          onClose={() => setReassignTarget(null)}
          onDeleted={handleReassigned}
        />
      )}
    </div>
  );
}

// ── Role editor ───────────────────────────────────────────────────────────────

function RoleEditor({
  role,
  catalog,
  onClose,
  onSaved,
}: {
  role: StaffRole | null;
  catalog: PermissionCatalog;
  onClose: () => void;
  onSaved: (role: StaffRole) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? []);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const groups = useMemo(() => groupPermissions(catalog.permissions), [catalog.permissions]);
  const labelOf = useMemo(() => new Map(catalog.permissions.map((p) => [p.key, p.label])), [catalog.permissions]);
  // key -> the selected permission that includes it
  const implied = useMemo(() => impliedBy(selected, catalog.permissions), [selected, catalog.permissions]);
  // Only what was ticked is saved; implied permissions are added when the role loads
  const toSave = selected.filter((key) => !implied.has(key));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const toggle = (key: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));

  const applyTemplate = (templateName: string) => {
    const template = catalog.templates.find((t) => t.name === templateName);
    if (!template) return;
    setSelected(template.permissions);
    if (!name.trim()) setName(template.name);
    if (!description.trim()) setDescription(template.description);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > NAME_MAX) {
      setFormError(`Give the role a name of 2–${NAME_MAX} characters.`);
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      const input = { name: trimmed, description: description.trim(), permissions: toSave };
      const { message, data } = role ? await updateRole(role._id, input) : await createRole(input);
      toast.success(message || (role ? "Role updated" : "Role created"));
      onSaved(data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save the role");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.55)] p-4 pt-12 sm:pt-16"
      onMouseDown={() => !isSaving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-editor-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <h3 id="role-editor-title" className="font-display text-lg font-semibold text-on-surface">
            {role ? `Edit ${role.name}` : "New role"}
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} disabled={isSaving} className="btn btn-ghost btn-icon -mr-2">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {formError && (
              <p className="notice notice-error" role="alert">
                {formError}
              </p>
            )}

            {catalog.templates.length > 0 && (
              <label className="block">
                <span className="label">Start from a template</span>
                <select
                  value=""
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="field"
                >
                  <option value="">Choose a template…</option>
                  {catalog.templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="hint">Fills in the boxes below. Nothing is saved until you save the role.</span>
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">
                  Name <span className="text-error">*</span>
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={NAME_MAX}
                  placeholder="e.g. Receptionist"
                  className="field"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="label">Description</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="What this role is for"
                  className="field"
                />
              </label>
            </div>

            <fieldset className="space-y-4">
              <legend className="label">Permissions</legend>
              {groups.map(([group, permissions]) => {
                const lawyerScoped = permissions.some((p) => p.scope === "lawyer");
                return (
                  <div key={group} className="panel p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h4 className="text-sm font-semibold text-on-surface">{group}</h4>
                      {lawyerScoped && (
                        <span className="text-xs text-on-surface-variant">Applies to all lawyers in a firm role</span>
                      )}
                    </div>
                    <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                      {permissions.map((permission) => {
                        const includedBy = implied.get(permission.key);
                        const checked = Boolean(includedBy) || selected.includes(permission.key);
                        return (
                          <li key={permission.key}>
                            <label
                              className={`flex min-h-9 items-start gap-2 py-1 text-sm ${
                                includedBy ? "cursor-default text-on-surface-variant" : "cursor-pointer text-on-surface"
                              }`}
                              title={includedBy ? `Included by ${labelOf.get(includedBy) ?? includedBy}` : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={Boolean(includedBy)}
                                onChange={(e) => toggle(permission.key, e.target.checked)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded"
                              />
                              <span>
                                {permission.label}
                                {includedBy && (
                                  <span className="block text-xs">Included by {labelOf.get(includedBy) ?? includedBy}</span>
                                )}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
            <span className="text-sm text-on-surface-variant">
              {plural(toSave.length + implied.size, "permission")} selected
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={isSaving} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? "Saving…" : role ? "Save role" : "Create role"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete a role that staff still hold ───────────────────────────────────────

function ReassignDialog({
  role,
  others,
  onClose,
  onDeleted,
}: {
  role: StaffRole;
  others: StaffRole[];
  onClose: () => void;
  onDeleted: (role: StaffRole, movedTo: string) => void;
}) {
  const [target, setTarget] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDeleting, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setIsDeleting(true);
    try {
      const { message } = await deleteRole(role._id, target);
      toast.success(message || "Role deleted");
      onDeleted(role, target);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.55)] p-4 pt-12 sm:pt-16"
      onMouseDown={() => !isDeleting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-role-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-md shadow-2xl"
      >
        <form onSubmit={submit}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <h3 id="reassign-role-title" className="font-display text-lg font-semibold text-on-surface">
              Delete the {role.name} role?
            </h3>
            <p className="text-sm leading-6 text-on-surface-variant">
              {plural(role.staffCount, "staff member")} {role.staffCount === 1 ? "has" : "have"} this role. Choose where
              they go; the change applies on their next click.
            </p>
            <label className="block">
              <span className="label">
                Move them to <span className="text-error">*</span>
              </span>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="field" required autoFocus>
                <option value="">Choose…</option>
                {others.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
                <option value="none">No role (they keep their login but lose all access)</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={isDeleting} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isDeleting || !target} className="btn btn-danger">
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isDeleting ? "Deleting…" : "Move staff and delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
