"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Loader2 } from "lucide-react";

const MAX_REASON = 500;

interface BlockUserDialogProps {
  /** The user to block; null keeps the dialog closed */
  user: { name: string; email: string } | null;
  /** Resolves when the request has finished (the dialog shows a spinner meanwhile) */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

// Styled like components/ConfirmDialog.tsx, with an optional reason field
export function BlockUserDialog({ user, onConfirm, onClose }: BlockUserDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!user) return;
    setReason("");
    setIsSubmitting(false);
    const previousFocus = document.activeElement as HTMLElement | null;
    reasonRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user, isSubmitting, onClose]);

  if (!user) return null;

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={() => !isSubmitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-user-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-5 shadow-2xl"
      >
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
            <Ban className="h-5 w-5 text-error" />
          </div>
          <div className="min-w-0">
            <h3 id="block-user-title" className="font-display text-lg font-semibold text-on-surface">
              Block {user.name}?
            </h3>
            <p className="mt-1 break-words text-sm text-on-surface-variant">{user.email}</p>
          </div>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
          <li>They are signed out of every device immediately.</li>
          <li>They cannot log in or reset their password while blocked.</li>
          <li>Their cases and appointments are kept. You can unblock them at any time.</li>
        </ul>

        <label className="mt-4 block text-sm text-on-surface-variant">
          Reason <span className="text-xs">(optional, kept for admins)</span>
          <textarea
            ref={reasonRef}
            value={reason}
            maxLength={MAX_REASON}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
            }}
            placeholder="e.g. Repeated abusive messages to staff"
            className="mt-1.5 w-full resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-secondary"
          />
          <span className="mt-1 block text-right text-xs">
            {reason.length}/{MAX_REASON}
          </span>
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Blocking…" : "Block user"}
          </button>
        </div>
      </div>
    </div>
  );
}
