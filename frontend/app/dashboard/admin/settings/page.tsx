"use client";

import { useAuth } from "../../../../components/AuthProvider";
import { SecuritySettingsCard } from "../../../../components/SecuritySettingsCard";

export default function AdminSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Account Settings</h3>
        <p className="text-sm text-on-surface-variant">
          Signed in as {user?.name} ({user?.email})
        </p>
      </header>
      <SecuritySettingsCard />
    </div>
  );
}
