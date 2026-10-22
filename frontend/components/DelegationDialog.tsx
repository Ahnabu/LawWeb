"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CatalogPermission } from "../lib/adminAccess";
import { DelegationPermissionPicker, permissionsToSave } from "./DelegationPermissionPicker";

interface DelegationDialogProps {
  title: string;
  intro?: ReactNode;
  // Extra fields above the checkboxes (email and name, a lawyer select…), owned by the caller
  children?: ReactNode;
  // The catalog's delegable permissions
  permissions: readonly CatalogPermission[];
  initial: string[];
  submitLabel: string;
  onClose: () => void;
  // Gets the permissions to store; throw to show the error in the dialog
  onSubmit: (permissions: string[]) => Promise<void>;
}

// Add or edit what one assistant may do for one lawyer
export function DelegationDialog({ title, intro, children, permissions, initial, submitLabel, onClose, onSubmit }: DelegationDialogProps) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const toSave = permissionsToSave(selected, permissions);
    if (!toSave.length) return setFormError("Choose at least one thing they can do.");
    setFormError(null);
    setIsSaving(true);
    try {
      await onSubmit(toSave);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
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
        aria-labelledby="delegation-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <h3 id="delegation-dialog-title" className="font-display text-lg font-semibold text-on-surface">
            {title}
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} disabled={isSaving} className="btn btn-ghost btn-icon -mr-2">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {formError && (
              <p className="notice notice-error" role="alert">
                {formError}
              </p>
            )}
            {intro && <div className="text-sm text-on-surface-variant">{intro}</div>}
            {children}
            <DelegationPermissionPicker permissions={permissions} selected={selected} onChange={setSelected} disabled={isSaving} />
          </div>
          <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={isSaving} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
