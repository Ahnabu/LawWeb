"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

// Styled confirm dialog (never the browser default). Mount <ConfirmDialogHost /> once
// (root layout), then `if (!(await confirmDialog({ ... }))) return;` anywhere.

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (red confirm button) */
  tone?: "danger" | "default";
  /** Extra content under the message, e.g. a list of what will be affected */
  details?: ReactNode;
  /** When set, the confirm button stays disabled until this exact text is typed */
  confirmPhrase?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

let showConfirm: ((request: PendingConfirm) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Host not mounted (should not happen): treat as cancelled rather than
    // falling back to the browser's native dialog
    if (!showConfirm) {
      console.error("confirmDialog called without <ConfirmDialogHost /> mounted");
      resolve(false);
      return;
    }
    showConfirm({ ...options, resolve });
  });
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [typed, setTyped] = useState("");
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const phraseRef = useRef<HTMLInputElement | null>(null);

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
    setTyped("");
    (pending.confirmPhrase ? phraseRef.current : confirmRef.current)?.focus();
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
  const phraseOk = !pending.confirmPhrase || typed.trim() === pending.confirmPhrase;
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 p-4" onMouseDown={() => close(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={pending.message ? "confirm-dialog-message" : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-5 shadow-2xl ${pending.details ? "max-w-md" : "max-w-sm"}`}
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
        {pending.details && <div className="mt-4 text-sm text-on-surface-variant">{pending.details}</div>}
        {pending.confirmPhrase && (
          <label className="mt-4 block text-sm text-on-surface-variant">
            Type <span className="font-semibold text-on-surface">{pending.confirmPhrase}</span> to confirm
            <input
              ref={phraseRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phraseOk) close(true);
              }}
              className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-secondary"
              autoComplete="off"
            />
          </label>
        )}
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
            disabled={!phraseOk}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "bg-error text-white" : "bg-secondary text-primary"}`}
          >
            {pending.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
