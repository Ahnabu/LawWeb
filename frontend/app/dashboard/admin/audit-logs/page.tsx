"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, RotateCcw, Search, X } from "lucide-react";
import { Pagination } from "../../../../components/Pagination";
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_ROLE_LABELS,
  dhakaToday,
  formatAuditTime,
  formatRelativeTime,
  getAuditLogMeta,
  isWarningAction,
  listAuditLogs,
  type AuditActorRole,
  type AuditCategory,
  type AuditLogEntry,
} from "../../../../lib/auditLogs";

const LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 350;

const CATEGORIES = Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[];
const ROLES = Object.keys(AUDIT_ROLE_LABELS) as AuditActorRole[];

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

const selectClass = "field";
const filterLabel = "label font-medium text-on-surface-variant";

// Neutral role chip with a small coloured dot
const ROLE_DOTS: Record<string, string> = {
  admin: "bg-secondary",
  lawyer: "bg-sky-600",
  client: "bg-success",
  anonymous: "bg-outline",
  system: "bg-outline",
};

function formatMetaValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.length ? value.map((v) => formatMetaValue(v)).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function AuditLogsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?actor=<userId>&actorName=<label> comes from the user detail page
  const actor = searchParams.get("actor") ?? "";
  const actorName = searchParams.get("actorName") ?? "";
  // ?onBehalfOf=<lawyerId>&onBehalfOfName=<label>: what staff did for one lawyer
  const onBehalfOf = searchParams.get("onBehalfOf") ?? "";
  const onBehalfOfName = searchParams.get("onBehalfOfName") ?? "";

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [actorRole, setActorRole] = useState<AuditActorRole | "all">("all");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const requestId = useRef(0);
  const today = dhakaToday();

  // Switching to another person's trail starts on page 1
  useEffect(() => {
    setPage(1);
    setOpenId(null);
  }, [actor, onBehalfOf]);

  // Relative times stay fresh while the page is open
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    getAuditLogMeta()
      .then((meta) => {
        setActions(meta.actions ?? []);
        setRetentionDays(meta.retentionDays ?? null);
      })
      .catch(() => {
        // The action dropdown is optional; the list still works without it
      });
  }, []);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, search]);

  const fetchLogs = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAuditLogs({
        page,
        limit: LIMIT,
        category,
        actorRole,
        action: action || undefined,
        actor: actor || undefined,
        onBehalfOf: onBehalfOf || undefined,
        search,
        from: from || undefined,
        to: to || undefined,
      });
      if (id !== requestId.current) return;
      setLogs(result.data);
      setTotal(result.meta?.total ?? 0);
      setNow(Date.now());
    } catch (err) {
      if (id !== requestId.current) return;
      setError(errorText(err, "Failed to load audit logs"));
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [page, category, actorRole, action, actor, onBehalfOf, search, from, to]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Every filter change starts again on page 1
  const withReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
      setOpenId(null);
    };

  const hasFilters =
    Boolean(search) || category !== "all" || actorRole !== "all" || Boolean(action) || Boolean(from) || Boolean(to) || Boolean(actor) || Boolean(onBehalfOf);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("all");
    setActorRole("all");
    setAction("");
    setFrom("");
    setTo("");
    setPage(1);
    setOpenId(null);
    if (actor || onBehalfOf) router.replace("/dashboard/admin/audit-logs");
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Audit Logs</h3>
        <p className="text-sm text-on-surface-variant">
          A record of sign-ins and every change made by admins, staff, lawyers and clients. Times are shown in Dhaka time.
          {retentionDays ? ` Entries are kept for ${retentionDays} days.` : ""}
        </p>
      </header>

      {onBehalfOf && (
        <div className="notice notice-info flex flex-wrap items-center justify-between gap-3">
          <span>
            Showing what staff did on behalf of <span className="font-semibold">{onBehalfOfName || "this lawyer"}</span> only.
          </span>
          <button
            type="button"
            onClick={() => router.replace("/dashboard/admin/audit-logs")}
            className="btn btn-ghost btn-sm"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Show everything
          </button>
        </div>
      )}

      {actor && (
        <div className="notice notice-info flex flex-wrap items-center justify-between gap-3">
          <span>
            Showing activity by <span className="font-semibold">{actorName || "this user"}</span> only.
          </span>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/admin/users/${actor}`} className="btn btn-secondary btn-sm">
              View user
            </Link>
            <button
              type="button"
              onClick={() => router.replace("/dashboard/admin/audit-logs")}
              className="btn btn-ghost btn-sm"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Show everyone
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by summary, person, email, target or IP"
            aria-label="Search audit logs"
            className="field pl-9 pr-11"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="btn btn-ghost btn-icon absolute right-1 top-1/2 h-9 min-h-0 w-9 -translate-y-1/2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className={filterLabel}>Category</span>
            <select
              value={category}
              onChange={(e) => withReset(setCategory)(e.target.value as AuditCategory | "all")}
              className={selectClass}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {AUDIT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={filterLabel}>Role</span>
            <select
              value={actorRole}
              onChange={(e) => withReset(setActorRole)(e.target.value as AuditActorRole | "all")}
              className={selectClass}
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {AUDIT_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={filterLabel}>Action</span>
            <select value={action} onChange={(e) => withReset(setAction)(e.target.value)} className={selectClass}>
              <option value="">All actions</option>
              {actions
                .filter((a) => category === "all" || a.startsWith(`${category}.`) || a === action)
                .map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className={filterLabel}>From</span>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => withReset(setFrom)(e.target.value)}
              className={selectClass}
            />
          </label>
          <label className="block">
            <span className={filterLabel}>To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => withReset(setTo)(e.target.value)}
              className={selectClass}
            />
          </label>
        </div>

        {hasFilters && (
          <button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm -ml-3">
            Clear filters
          </button>
        )}
      </div>

      {isLoading && logs.length === 0 ? (
        <div className="card h-96 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchLogs()}
            className="btn btn-secondary btn-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            {hasFilters ? "No activity matches these filters." : "No activity has been recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <div className={`card overflow-hidden transition-opacity ${isLoading ? "opacity-60" : ""}`}>
            {/* Column headings, wide screens only */}
            <div className="hidden grid-cols-[9rem_12rem_1fr_8rem] gap-4 border-b border-outline-variant bg-surface-container px-5 py-2.5 text-sm font-semibold text-on-surface-variant lg:grid">
              <span>Time</span>
              <span>Who</span>
              <span>What</span>
              <span>IP address</span>
            </div>
            <ul className="divide-y divide-outline-variant">
              {logs.map((log) => {
                const open = openId === log._id;
                const warn = isWarningAction(log.action);
                const metaEntries = Object.entries(log.metadata ?? {});
                return (
                  <li key={log._id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : log._id)}
                      aria-expanded={open}
                      className="grid w-full grid-cols-1 gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-container/60 sm:px-5 lg:grid-cols-[9rem_12rem_1fr_8rem] lg:gap-4"
                    >
                      <span className="text-sm text-on-surface-variant" title={formatAuditTime(log.createdAt)}>
                        {formatRelativeTime(log.createdAt, now)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-on-surface" title={log.actorEmail || undefined}>
                            {log.actorName || log.actorEmail || "Unknown"}
                          </span>
                          <span className="chip shrink-0">
                            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${ROLE_DOTS[log.actorRole] ?? ROLE_DOTS.system}`} />
                            {AUDIT_ROLE_LABELS[log.actorRole] ?? log.actorRole}
                          </span>
                        </span>
                        {log.onBehalfOf && (
                          <span className="block truncate text-xs text-on-surface-variant">
                            on behalf of {log.onBehalfOfName || "a lawyer"}
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 items-start gap-2">
                        {open ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                          <span className={`block text-sm ${warn ? "font-medium text-error" : "text-on-surface"}`}>{log.summary}</span>
                          <span className="block truncate font-mono text-xs text-on-surface-variant">
                            {log.action}
                            {log.targetLabel ? ` · ${log.targetLabel}` : ""}
                          </span>
                        </span>
                      </span>
                      <span className="truncate font-mono text-xs text-on-surface-variant lg:pt-0.5">{log.ip || "—"}</span>
                    </button>

                    {open && (
                      <div className="border-t border-outline-variant bg-surface-container/40 px-4 py-4 text-sm sm:px-5 lg:pl-93">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
                          <dt className="text-on-surface-variant">Time (Dhaka)</dt>
                          <dd className="text-on-surface">{formatAuditTime(log.createdAt)}</dd>
                          {log.actorEmail && (
                            <>
                              <dt className="text-on-surface-variant">Email</dt>
                              <dd className="break-all text-on-surface">
                                {log.actor ? (
                                  <Link
                                    href={`/dashboard/admin/audit-logs?actor=${log.actor}&actorName=${encodeURIComponent(log.actorName || log.actorEmail)}`}
                                    className="text-link font-normal"
                                  >
                                    {log.actorEmail}
                                  </Link>
                                ) : (
                                  log.actorEmail
                                )}
                              </dd>
                            </>
                          )}
                          {log.onBehalfOf && (
                            <>
                              <dt className="text-on-surface-variant">On behalf of</dt>
                              <dd className="text-on-surface">
                                <Link
                                  href={`/dashboard/admin/audit-logs?onBehalfOf=${log.onBehalfOf}&onBehalfOfName=${encodeURIComponent(log.onBehalfOfName || "")}`}
                                  className="text-link font-normal"
                                >
                                  {log.onBehalfOfName || log.onBehalfOf}
                                </Link>
                              </dd>
                            </>
                          )}
                          <dt className="text-on-surface-variant">Category</dt>
                          <dd className="text-on-surface">{AUDIT_CATEGORY_LABELS[log.category] ?? log.category}</dd>
                          {(log.targetType || log.targetLabel) && (
                            <>
                              <dt className="text-on-surface-variant">Target</dt>
                              <dd className="break-all text-on-surface">
                                {[log.targetType, log.targetLabel].filter(Boolean).join(": ")}
                                {log.targetId && <span className="ml-2 font-mono text-xs text-on-surface-variant">{log.targetId}</span>}
                              </dd>
                            </>
                          )}
                          {metaEntries.map(([key, value]) => (
                            <div key={key} className="contents">
                              <dt className="text-on-surface-variant">{key}</dt>
                              <dd className="break-all text-on-surface">{formatMetaValue(value)}</dd>
                            </div>
                          ))}
                          {log.userAgent && (
                            <>
                              <dt className="text-on-surface-variant">Device</dt>
                              <dd className="break-all text-xs text-on-surface-variant">{log.userAgent}</dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <Pagination page={page} pageSize={LIMIT} total={total} onPageChange={setPage} disabled={isLoading} />
        </>
      )}
    </div>
  );
}

// useSearchParams needs a Suspense boundary in the App Router
export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogsView />
    </Suspense>
  );
}
