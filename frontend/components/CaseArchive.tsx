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
  const colors = tone === "danger" ? "border-error/30 text-error" : "";
  return (
    <span
      className={`chip ${colors} ${className}`}
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
        <span className="label">Note (optional)</span>
        <textarea
          rows={2}
          maxLength={500}
          onChange={(e) => {
            captured.note = e.target.value;
          }}
          placeholder="Why is this case being archived?"
          className="field min-h-0 resize-none"
        />
      </label>
    ),
  });
  return confirmed ? captured.note.trim() : null;
}
