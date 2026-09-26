"use client";

import { toast } from "sonner";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function SecuritySettingsCard() {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
      <h3 className="text-sm font-semibold text-on-surface">Security</h3>
      <p className="mt-2 text-sm text-on-surface-variant">
        Change your password. Forgot it? Log out and use &ldquo;Forgot Password&rdquo; on the login page.
      </p>
      <div className="mt-4 max-w-md">
        <ChangePasswordForm onSuccess={(message) => toast.success(message)} />
      </div>
    </section>
  );
}
