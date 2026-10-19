"use client";

import { toast } from "sonner";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function SecuritySettingsCard() {
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="text-lg text-heading">Security</h3>
      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
        Change your password. Forgot it? Log out and use &ldquo;Forgot Password&rdquo; on the login page.
      </p>
      <div className="mt-5 max-w-md">
        <ChangePasswordForm onSuccess={(message) => toast.success(message)} />
      </div>
    </section>
  );
}
