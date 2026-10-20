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
  /** What blocking does, listed in the dialog (defaults to the client wording) */
  consequences?: string[];
}

const CLIENT_CONSEQUENCES = [
  "They are signed out of every device immediately.",
  "They cannot log in or reset their password while blocked.",
  "Their cases and appointments are kept. You can unblock them at any time.",
];

// Styled like components/ConfirmDialog.tsx, with an optional reason field
export function BlockUserDialog({ user, onConfirm, onClose, consequences = CLIENT_CONSEQUENCES }: BlockUserDialogProps) {
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
      className="fixed inset-0 z-200 flex items-center justify-center bg-[rgb(10_22_40/0.55)] p-4"
      onMouseDown={() => !isSubmitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-user-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-2xl sm:p-6"
      >
        <div className="flex gap-3">
          <Ban aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div className="min-w-0">
            <h3 id="block-user-title" className="font-display text-lg font-semibold text-on-surface">
              Block {user.name}?
            </h3>
            <p className="mt-1 break-words text-sm text-on-surface-variant">{user.email}</p>
          </div>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
          {consequences.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <label className="mt-5 block">
          <span className="label">
            Reason <span className="font-normal text-on-surface-variant">(optional, kept for admins)</span>
          </span>
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
            className="field min-h-0"
          />
          <span className="hint block text-right tabular-nums">
            {reason.length}/{MAX_REASON}
          </span>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            className="btn btn-danger"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Blocking…" : "Block user"}
          </button>
        </div>
      </div>
    </div>
  );
}
