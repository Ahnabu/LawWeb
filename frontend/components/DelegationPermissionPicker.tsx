"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { impliedBy, type CatalogPermission } from "../lib/adminAccess";
import { DELEGATION_PRESETS, SENSITIVE_PERMISSION_WARNINGS } from "../lib/delegation";

interface DelegationPermissionPickerProps {
  // The catalog's lawyer-scoped permissions (`delegable`)
  permissions: readonly CatalogPermission[];
  // What is ticked (implied ones are shown as included, not stored)
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

// Checkboxes for what an assistant may do for one lawyer, grouped like the
// catalog, with presets that only pre-tick boxes. Used by the lawyer's "My Team"
// and the super-admin's Team page.
export function DelegationPermissionPicker({ permissions, selected, onChange, disabled }: DelegationPermissionPickerProps) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, CatalogPermission[]>();
    for (const permission of permissions) byGroup.set(permission.group, [...(byGroup.get(permission.group) ?? []), permission]);
    return [...byGroup.entries()];
  }, [permissions]);
  const labelOf = useMemo(() => new Map(permissions.map((p) => [p.key, p.label])), [permissions]);
  const implied = useMemo(() => impliedBy(selected, permissions), [selected, permissions]);

  const toggle = (key: string, checked: boolean) =>
    onChange(checked ? [...selected, key] : selected.filter((k) => k !== key));

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="label">What they can do</legend>
      <div className="flex flex-wrap gap-2">
        {DELEGATION_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange([...preset.permissions])}
            className="btn btn-secondary btn-sm"
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {groups.map(([group, groupPermissions]) => (
        <div key={group} className="panel p-3">
          <h4 className="text-sm font-semibold text-on-surface">{group}</h4>
          <ul className="mt-1 grid gap-x-4 sm:grid-cols-2">
            {groupPermissions.map((permission) => {
              const includedBy = implied.get(permission.key);
              const checked = Boolean(includedBy) || selected.includes(permission.key);
              const warning = SENSITIVE_PERMISSION_WARNINGS[permission.key];
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
                      {warning && checked && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-gold-ink">
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {warning}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </fieldset>
  );
}

// Only the ticked keys that aren't already included by another ticked key
export const permissionsToSave = (selected: string[], permissions: readonly CatalogPermission[]) => {
  const implied = impliedBy(selected, permissions);
  return selected.filter((key) => !implied.has(key));
};
