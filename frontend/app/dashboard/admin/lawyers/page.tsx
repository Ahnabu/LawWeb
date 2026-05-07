"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";

interface LawyerItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  barId?: string;
  isVerified: boolean;
}

export default function AdminLawyersPage() {
  const [lawyers, setLawyers] = useState<LawyerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/lawyers`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch lawyers");
        }
        const data = await response.json();
        setLawyers(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLawyers();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-32 animate-pulse rounded bg-surface-container" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`lawyer-skeleton-${index}`}
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
          Lawyers
        </h2>
        <p className="text-sm text-on-surface-variant">
          Verified and pending lawyer accounts.
        </p>
      </header>

      {lawyers.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No lawyers found.
        </div>
      ) : (
        <div className="space-y-4">
          {lawyers.map((lawyer) => (
            <div
              key={lawyer._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">{lawyer.name}</p>
                  <p className="text-sm text-on-surface-variant">
                    {lawyer.email} {lawyer.barId ? `| Bar ID: ${lawyer.barId}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    lawyer.isVerified
                      ? "bg-success/10 text-success"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {lawyer.isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              {lawyer.phone && (
                <p className="mt-2 text-xs text-on-surface-variant">{lawyer.phone}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
