"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAuditTime, formatRelativeTime, isWarningAction, listAuditLogs, type AuditLogEntry } from "../../../../../lib/auditLogs";

const RECENT_LIMIT = 10;

/** Last few audit entries where this user was the actor, with a link to the full trail */
export function RecentActivity({ userId, userName }: { userId: string; userName: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAuditLogs({ actor: userId, limit: RECENT_LIMIT })
      .then((result) => {
        if (!active) return;
        setLogs(result.data);
        setTotal(result.meta?.total ?? result.data.length);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load activity");
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const fullTrailHref = `/dashboard/admin/audit-logs?actor=${userId}&actorName=${encodeURIComponent(userName)}`;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display text-lg font-semibold text-on-surface">
          Recent activity
        </h4>
        {total > 0 && (
          <Link href={fullTrailHref} className="text-link text-sm">
            View all{total > RECENT_LIMIT ? ` (${total})` : ""}
          </Link>
        )}
      </div>

      {error ? (
        <p className="notice notice-error" role="alert">{error}</p>
      ) : logs === null ? (
        <div className="panel h-24" aria-busy="true" />
      ) : logs.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-on-surface-variant">
          No recorded activity yet.
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
          {logs.map((log) => (
            <li key={log._id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-4">
              <div className="min-w-0">
                <p className={`text-sm ${isWarningAction(log.action) ? "font-medium text-error" : "text-on-surface"}`}>{log.summary}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-on-surface-variant">
                  {log.action}
                  {log.ip ? ` · ${log.ip}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm text-on-surface-variant" title={formatAuditTime(log.createdAt)}>
                {formatRelativeTime(log.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
