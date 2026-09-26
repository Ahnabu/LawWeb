"use client";

import { Lock } from "lucide-react";
import { ChangePasswordForm } from "./ChangePasswordForm";

interface ChangePasswordModalProps {
  onSuccess: () => void;
}

export function ChangePasswordModal({ onSuccess }: ChangePasswordModalProps) {
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
            Your account uses a temporary password. You must set a new password to continue.
          </p>
        </div>

        <div className="p-5">
          <ChangePasswordForm onSuccess={() => onSuccess()} submitLabel="Set New Password" />
        </div>
      </div>
    </div>
  );
}
