"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import { Users, Mail, Phone } from "lucide-react";

interface ClientItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/clients?page=${page}&limit=${LIMIT}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setClients(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
          User Management
        </h3>
        <p className="text-sm text-on-surface-variant">
          All registered client accounts &mdash; {total} total.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="h-16 animate-pulse rounded-xl border border-outline-variant bg-surface-container"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No registered clients yet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Name
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant sm:table-cell">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant md:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant bg-surface">
                {clients.map((client) => (
                  <tr
                    key={client._id}
                    className="transition hover:bg-surface-container/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-on-surface">{client.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant sm:hidden">
                        <Mail className="h-3 w-3 shrink-0" />
                        {client.email}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p className="flex items-center gap-1.5 text-on-surface-variant">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {client.email}
                      </p>
                      {client.phone && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {client.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          client.isVerified
                            ? "bg-green-500/10 text-green-700"
                            : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {client.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-on-surface-variant md:table-cell">
                      {new Date(client.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
