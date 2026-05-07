"use client";

import { useAuth } from "../../../../components/AuthProvider";

export default function LawyerProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Profile
        </h2>
        <p className="text-sm text-on-surface-variant">
          Keep your professional details up to date.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
          <h3 className="text-sm font-semibold text-on-surface">Professional Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-on-surface-variant">Full name</p>
              <p className="mt-1 font-medium text-on-surface">
                {user?.name || "Lawyer"}
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
              <p className="text-xs uppercase text-on-surface-variant">Bar ID</p>
              <p className="mt-1 font-medium text-on-surface">
                {user?.barId || "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
          <h3 className="text-sm font-semibold text-on-surface">Verification</h3>
          <p className="mt-3 text-sm text-on-surface-variant">
            Status: {user?.isVerified ? "Verified" : "Pending"}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            Contact admin if your details need updates.
          </p>
        </section>
      </div>
    </div>
  );
}
