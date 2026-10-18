"use client";

import { Archive } from "lucide-react";
import { confirmDialog } from "./ConfirmDialog";

// Shared archive UI for the admin and lawyer case pages

export function ArchivedBadge({
  label = "Archived",
  tone = "neutral",
  className = "",
}: {
  label?: string;
  /** "danger" for cases archived because their lawyer was deleted */
  tone?: "neutral" | "danger";
  className?: string;
}) {
  const colors = tone === "danger" ? "bg-error/10 text-error" : "bg-outline/20 text-on-surface-variant";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors} ${className}`}
    >
      <Archive className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Ask for confirmation before archiving, with an optional note.
 * Resolves to the note ("" when left blank) or null when cancelled.
 */
export async function askArchiveCase({
  caseNumber,
  title,
  restoreHint,
}: {
  caseNumber?: string;
  title: string;
  restoreHint: string;
}): Promise<string | null> {
  // The textarea is uncontrolled, so its value is captured here as the user types
  const captured = { note: "" };
  const confirmed = await confirmDialog({
    title: `Archive ${caseNumber || "this case"}?`,
    message: `"${title}" will move to the archive and become read-only. ${restoreHint}`,
    confirmLabel: "Archive case",
    details: (
      <label className="block">
        <span className="text-xs font-medium">Note (optional)</span>
        <textarea
          rows={2}
          maxLength={500}
          onChange={(e) => {
            captured.note = e.target.value;
          }}
          placeholder="Why is this case being archived?"
          className="mt-1 block w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
        />
      </label>
    ),
  });
  return confirmed ? captured.note.trim() : null;
}
