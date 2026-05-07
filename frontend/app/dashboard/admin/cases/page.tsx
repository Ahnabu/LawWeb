"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";

interface CaseItem {
  _id: string;
  title: string;
  description: string;
  status: string;
  lawyerId?: { name?: string; email?: string };
  clientId?: { name?: string; email?: string };
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/cases`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch cases");
        }
        const data = await response.json();
        setCases(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-32 animate-pulse rounded bg-surface-container" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`case-skeleton-${index}`}
              className="h-24 animate-pulse rounded-lg border border-outline-variant bg-surface-container"
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
          Cases
        </h2>
        <p className="text-sm text-on-surface-variant">
          Monitor case activity and assignments.
        </p>
      </header>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No cases found.
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((item) => (
            <div
              key={item._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">{item.title}</p>
                  <p className="text-sm text-on-surface-variant">
                    Client: {item.clientId?.name || "-"} | Lawyer: {item.lawyerId?.name || "-"}
                  </p>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-on-surface-variant">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
