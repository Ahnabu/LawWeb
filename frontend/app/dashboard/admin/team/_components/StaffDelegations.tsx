"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "../../../../../components/ConfirmDialog";
import { DelegationDialog } from "../../../../../components/DelegationDialog";
import {
  grantStaffDelegation,
  revokeStaffDelegation,
  updateStaffDelegation,
  type CatalogPermission,
  type StaffDelegation,
} from "../../../../../lib/adminAccess";
import { getAdminLawyers, type AdminLawyer } from "../../../../../lib/dashboard";
import { summarizePermissions } from "../../../../../lib/delegation";

type Dialog = { kind: "add" } | { kind: "edit"; delegation: StaffDelegation } | null;

// "Lawyers they assist" on the staff detail page. Lawyers manage their own
// assistants from My Team; the super-admin can do it for any lawyer here.
export function StaffDelegations({
  staffId,
  staffName,
  delegations,
  delegable,
  onChange,
}: {
  staffId: string;
  staffName: string;
  delegations: StaffDelegation[];
  // The catalog's lawyer-scoped permissions
  delegable: readonly CatalogPermission[];
  onChange: (delegations: StaffDelegation[]) => void;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);

  const remove = async (delegation: StaffDelegation) => {
    const confirmed = await confirmDialog({
      title: `Remove ${delegation.lawyerName}?`,
      message: `${staffName} will no longer see or change ${delegation.lawyerName}'s work. Their account and role are not affected.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const { message, data } = await revokeStaffDelegation(staffId, delegation.lawyerId);
      onChange(data);
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the lawyer");
    }
  };

  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-lg font-semibold text-on-surface">Lawyers they assist</h4>
          <p className="mt-1 text-sm text-on-surface-variant">
            Access to one lawyer&apos;s appointments, cases, availability or profile, separate from their role. Lawyers can
            also manage this from their own My Team page.
          </p>
        </div>
        <button type="button" onClick={() => setDialog({ kind: "add" })} disabled={!delegable.length} className="btn btn-secondary btn-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add lawyer
        </button>
      </div>

      {delegations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">They don&apos;t assist any lawyer.</p>
      ) : (
        <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
          {delegations.map((delegation) => (
            <li key={delegation.lawyerId} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface">
                  {delegation.lawyerName}
                  {!delegation.lawyerActive && (
                    <span className="chip ml-2" title="The lawyer is blocked or removed. Access returns when they are restored.">
                      Suspended
                    </span>
                  )}
                </p>
                <p className="text-sm text-on-surface">{summarizePermissions(delegation.permissions)}</p>
                <p className="text-xs text-on-surface-variant">
                  Given by {delegation.grantedByRole === "lawyer" ? "the lawyer" : delegation.grantedByName ?? "the firm administrator"}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setDialog({ kind: "edit", delegation })} className="btn btn-ghost btn-sm">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button type="button" onClick={() => void remove(delegation)} className="btn btn-ghost btn-sm hover:text-error">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === "add" && (
        <AddLawyerDialog
          staffId={staffId}
          staffName={staffName}
          exclude={delegations.map((d) => d.lawyerId)}
          delegable={delegable}
          onClose={() => setDialog(null)}
          onSaved={(next) => {
            onChange(next);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "edit" && (
        <DelegationDialog
          title={`What ${staffName} can do for ${dialog.delegation.lawyerName}`}
          permissions={delegable}
          initial={dialog.delegation.permissions}
          submitLabel="Save"
          onClose={() => setDialog(null)}
          onSubmit={async (permissions) => {
            const { message, data } = await updateStaffDelegation(staffId, dialog.delegation.lawyerId, permissions);
            onChange(data);
            toast.success(message);
            setDialog(null);
          }}
        />
      )}
    </section>
  );
}

function AddLawyerDialog({
  staffId,
  staffName,
  exclude,
  delegable,
  onClose,
  onSaved,
}: {
  staffId: string;
  staffName: string;
  exclude: string[];
  delegable: readonly CatalogPermission[];
  onClose: () => void;
  onSaved: (delegations: StaffDelegation[]) => void;
}) {
  const [lawyers, setLawyers] = useState<AdminLawyer[] | null>(null);
  const [lawyerId, setLawyerId] = useState("");

  useEffect(() => {
    getAdminLawyers()
      .then(({ lawyers: list }) => setLawyers(list))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load lawyers");
        setLawyers([]);
      });
  }, []);

  const options = useMemo(() => (lawyers ?? []).filter((l) => !exclude.includes(l._id)), [lawyers, exclude]);

  return (
    <DelegationDialog
      title={`Add a lawyer for ${staffName}`}
      permissions={delegable}
      initial={[]}
      submitLabel="Add lawyer"
      onClose={onClose}
      onSubmit={async (permissions) => {
        if (!lawyerId) throw new Error("Choose a lawyer.");
        const { message, data } = await grantStaffDelegation(staffId, lawyerId, permissions);
        toast.success(message);
        onSaved(data);
      }}
    >
      <label className="block">
        <span className="label">
          Lawyer <span className="text-error">*</span>
        </span>
        <select value={lawyerId} onChange={(e) => setLawyerId(e.target.value)} className="field" disabled={!lawyers}>
          <option value="">{lawyers ? (options.length ? "Choose a lawyer…" : "They already assist every lawyer") : "Loading…"}</option>
          {options.map((lawyer) => (
            <option key={lawyer._id} value={lawyer._id}>
              {lawyer.name}
              {lawyer.isBlocked ? " (blocked)" : ""}
            </option>
          ))}
        </select>
      </label>
    </DelegationDialog>
  );
}
