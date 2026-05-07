"use client";

import { useAuth } from "../../../../components/AuthProvider";

export default function ClientProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Profile
        </h2>
        <p className="text-sm text-on-surface-variant">
          Manage your account details and preferences.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
          <h3 className="text-sm font-semibold text-on-surface">Account Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-on-surface-variant">Full name</p>
              <p className="mt-1 font-medium text-on-surface">
                {user?.name || "Client"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-on-surface-variant">Email</p>
              <p className="mt-1 font-medium text-on-surface">
                {user?.email || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-on-surface-variant">Phone</p>
              <p className="mt-1 font-medium text-on-surface">
                {user?.phone || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-on-surface-variant">Role</p>
              <p className="mt-1 font-medium text-on-surface">
                {user?.role || "client"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
          <h3 className="text-sm font-semibold text-on-surface">Security</h3>
          <p className="mt-3 text-sm text-on-surface-variant">
            Password updates and account recovery will be enabled soon.
          </p>
          <button
            className="mt-4 w-full rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-on-surface-variant"
            type="button"
            disabled
          >
            Update Password (coming soon)
          </button>
        </section>
      </div>
    </div>
  );
}
