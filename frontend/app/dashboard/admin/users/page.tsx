"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";

interface ClientItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isVerified: boolean;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/clients`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch clients");
        }
        const data = await response.json();
        setClients(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-28 animate-pulse rounded bg-surface-container" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`client-skeleton-${index}`}
              className="h-20 animate-pulse rounded-lg border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className="text-error">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          Users
        </h2>
        <p className="text-sm text-on-surface-variant">
          Client accounts and verification status.
        </p>
      </header>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No clients found.
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">{client.name}</p>
                  <p className="text-sm text-on-surface-variant">
                    {client.email}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    client.isVerified
                      ? "bg-success/10 text-success"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {client.isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              {client.phone && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  {client.phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
