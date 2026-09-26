"use client";

import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changePassword, passwordProblem } from "../lib/auth";

interface ChangePasswordFormProps {
  onSuccess: (message: string) => void;
  submitLabel?: string;
}

// Used by the forced first-login modal and the account settings pages
export function ChangePasswordForm({ onSuccess, submitLabel = "Update Password" }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const problem = passwordProblem(newPassword);
    if (problem) {
      setError(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <label className="block text-xs font-medium text-on-surface-variant">
        Current Password
        <div className="relative mt-1">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter current password"
            className="block w-full rounded-lg border border-outline bg-surface px-3 py-2.5 pr-10 text-sm text-on-surface outline-none focus:border-primary"
          />
          <button
            type="button"
            aria-label={showCurrent ? "Hide password" : "Show password"}
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute inset-y-0 right-2.5 flex items-center text-on-surface-variant hover:text-primary"
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label className="block text-xs font-medium text-on-surface-variant">
        New Password
        <div className="relative mt-1">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="8+ chars, upper, lower, number, symbol"
            className="block w-full rounded-lg border border-outline bg-surface px-3 py-2.5 pr-10 text-sm text-on-surface outline-none focus:border-primary"
          />
          <button
            type="button"
            aria-label={showNew ? "Hide password" : "Show password"}
            onClick={() => setShowNew((v) => !v)}
            className="absolute inset-y-0 right-2.5 flex items-center text-on-surface-variant hover:text-primary"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label className="block text-xs font-medium text-on-surface-variant">
        Confirm New Password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Re-enter new password"
          className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
        />
      </label>

      <p className="text-[11px] leading-5 text-on-surface-variant">
        Changing your password signs you out on every other device.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition disabled:opacity-50"
      >
        {isSubmitting ? "Changing Password…" : submitLabel}
      </button>
    </form>
  );
}
