"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../lib/api";

interface CaseItem {
  _id: string;
  title: string;
  description: string;
  status: string;
  clientId?: {
    name?: string;
    email?: string;
  };
  nextCourtDate?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-secondary/10 text-secondary",
  filed: "bg-secondary/10 text-secondary",
  "hearing-scheduled": "bg-secondary/10 text-secondary",
  "under-review": "bg-secondary/10 text-secondary",
  closed: "bg-success/10 text-success",
  won: "bg-success/10 text-success",
  lost: "bg-error/10 text-error",
};

export default function LawyerCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cases/my-cases`, {
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
          Track assigned matters and update progress.
        </p>
      </header>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
          No cases assigned yet.
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((caseItem) => (
            <div
              key={caseItem._id}
              className="rounded-lg border border-outline-variant bg-surface-container p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">
                    {caseItem.title}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Client: {caseItem.clientId?.name || "Client"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[caseItem.status] ||
                    "bg-surface text-on-surface"
                  }`}
                >
                  {caseItem.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-on-surface-variant">
                {caseItem.description}
              </p>
              {caseItem.nextCourtDate && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  Next court date:{" "}
                  {new Date(caseItem.nextCourtDate).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
