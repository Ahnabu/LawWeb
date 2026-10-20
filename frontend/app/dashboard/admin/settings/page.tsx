"use client";

import Image from "next/image";
import { useAuth } from "../../../../components/AuthProvider";
import { SecuritySettingsCard } from "../../../../components/SecuritySettingsCard";

export default function AdminSettingsPage() {
  const { user } = useAuth();

  const initials = (user?.name ?? "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Staff see their firm role's name, the super-admin a label rather than "admin"
  const roleLabel =
    user?.role === "staff" ? user.access?.roleName || "Staff (no role yet)" : user?.role === "admin" ? "Super Admin" : user?.role;

  const details = [
    { label: "Email", value: user?.email },
    { label: "Role", value: roleLabel },
    { label: "Phone", value: user?.phone || "Not added" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Account Settings</h3>
        <p className="text-sm text-on-surface-variant">Your account details and sign-in security.</p>
      </header>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {user?.profileImageUrl ? (
            <Image
              src={user.profileImageUrl}
              alt={user.name}
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full border border-outline-variant object-cover"
            />
          ) : (
            <span className="monogram h-14 w-14 text-lg">{initials}</span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-heading">{user?.name}</p>
            <p className="text-sm text-on-surface-variant">{roleLabel}</p>
          </div>
        </div>

        <dl className="panel mt-5 grid sm:grid-cols-3">
          {details.map((item, index) => (
            <div
              key={item.label}
              className={`px-5 py-4 ${index > 0 ? "border-t border-outline-variant sm:border-t-0 sm:border-l" : ""}`}
            >
              <dt className="text-sm text-on-surface-variant">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-on-surface">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <SecuritySettingsCard />
    </div>
  );
}
