"use client";

import { Lock } from "lucide-react";
import { ChangePasswordForm } from "./ChangePasswordForm";

interface ChangePasswordModalProps {
  onSuccess: () => void;
}

export function ChangePasswordModal({ onSuccess }: ChangePasswordModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(10_22_40/0.55)] p-4">
      <div className="card w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="border-b border-outline-variant p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-heading">
            <Lock aria-hidden="true" className="h-4.5 w-4.5 text-gold-ink" />
            Change Your Password
          </h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Your account uses a temporary password. You must set a new password to continue.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <ChangePasswordForm onSuccess={() => onSuccess()} submitLabel="Set New Password" />
        </div>
      </div>
    </div>
  );
}
