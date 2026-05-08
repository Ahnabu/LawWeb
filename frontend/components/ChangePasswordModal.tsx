"use client";

import { useState, FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { API_BASE_URL } from "../lib/api";

interface ChangePasswordModalProps {
  onSuccess: () => void;
}

export function ChangePasswordModal({ onSuccess }: ChangePasswordModalProps) {
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

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
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
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to change password");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface shadow-2xl">
        {/* Header */}
        <div className="border-b border-outline-variant p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
            <Lock className="h-6 w-6 text-secondary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-on-surface">
            Change Your Password
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Your account uses a default password. You must set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          {/* Current password */}
          <label className="block text-xs font-medium text-on-surface-variant">
            Current Password
            <div className="relative mt-1">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
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

          {/* New password */}
          <label className="block text-xs font-medium text-on-surface-variant">
            New Password
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
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

          {/* Confirm password */}
          <label className="block text-xs font-medium text-on-surface-variant">
            Confirm New Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter new password"
              className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition disabled:opacity-50"
          >
            {isSubmitting ? "Changing Password…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
