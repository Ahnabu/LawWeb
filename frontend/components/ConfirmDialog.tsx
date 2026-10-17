"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

// Styled replacement for window.confirm(). Mount <ConfirmDialogHost /> once
// (root layout), then `if (!(await confirmDialog({ ... }))) return;` anywhere.

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (red confirm button) */
  tone?: "danger" | "default";
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

let showConfirm: ((request: PendingConfirm) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Host not mounted (should not happen): fall back to the native dialog
    if (!showConfirm) {
      resolve(window.confirm(options.message ? `${options.title}\n\n${options.message}` : options.title));
      return;
    }
    showConfirm({ ...options, resolve });
  });
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    showConfirm = (request) =>
      setPending((current) => {
        // A newer request replaces an open one; the old one counts as cancelled
        current?.resolve(false);
        return request;
      });
    return () => {
      showConfirm = null;
    };
  }, []);

  const close = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  useEffect(() => {
    if (!pending) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        pending.resolve(false);
        setPending(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus?.();
    };
  }, [pending]);

  if (!pending) return null;

  const danger = pending.tone === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 p-4" onMouseDown={() => close(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={pending.message ? "confirm-dialog-message" : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface p-5 shadow-2xl"
      >
        <div className="flex gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-error/10" : "bg-secondary/10"}`}>
            <Icon className={`h-5 w-5 ${danger ? "text-error" : "text-secondary"}`} />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="font-display text-lg font-semibold text-on-surface">
              {pending.title}
            </h3>
            {pending.message && (
              <p id="confirm-dialog-message" className="mt-1 text-sm text-on-surface-variant">
                {pending.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container"
          >
            {pending.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 ${danger ? "bg-error text-white" : "bg-secondary text-primary"}`}
          >
            {pending.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
