"use client";

import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changePassword, passwordProblem } from "../lib/auth";

interface ChangePasswordFormProps {
  onSuccess: (message: string) => void;
  submitLabel?: string;
}

// Used by the forced first-login modal and the account settings pages
export function ChangePasswordForm({
  onSuccess,
  submitLabel = "Update Password",
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      setError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <label className="block text-sm font-semibold text-on-surface">
        Current Password
        <div className="relative mt-1.5">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter current password"
            className="field pr-12 font-normal"
          />
          <button
            type="button"
            aria-label={showCurrent ? "Hide password" : "Show password"}
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {showCurrent ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </label>

      <label className="block text-sm font-semibold text-on-surface">
        New Password
        <div className="relative mt-1.5">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="8+ chars, upper, lower, number, symbol"
            className="field pr-12 font-normal"
          />
          <button
            type="button"
            aria-label={showNew ? "Hide password" : "Show password"}
            onClick={() => setShowNew((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {showNew ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </label>

      <label className="block text-sm font-semibold text-on-surface">
        Confirm New Password
        <div className="relative mt-1.5">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Re-enter new password"
            className="field pr-12 font-normal"
          />
          <button
            type="button"
            aria-label={showConfirm ? "Hide password" : "Show password"}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </label>

      <p className="hint">
        Changing your password signs you out on every other device.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary btn-block"
      >
        {isSubmitting ? "Changing Password…" : submitLabel}
      </button>
    </form>
  );
}
