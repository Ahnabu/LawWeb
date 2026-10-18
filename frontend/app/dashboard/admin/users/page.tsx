"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Eye, Mail, Phone, RotateCcw, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import {
  formatDate,
  listUsers,
  type ManagedUser,
  type UserCounts,
  type UserSort,
  type UserStatusFilter,
} from "../../../../lib/adminUsers";
import { BlockUserDialog } from "./_components/BlockUserDialog";
import { UserAvatar, UserStatusBadge, confirmAndDelete, confirmAndUnblock, performBlock } from "./_components/userActions";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 350;

const FILTERS: { key: UserStatusFilter; label: string; hint: string }[] = [
  { key: "all", label: "All clients", hint: "Every registered client" },
  { key: "active", label: "Active", hint: "Verified and not blocked" },
  { key: "blocked", label: "Blocked", hint: "Cannot log in" },
  { key: "unverified", label: "Unverified", hint: "Email not confirmed yet" },
];

const FILTER_ACCENTS: Record<UserStatusFilter, string> = {
  all: "text-on-surface",
  active: "text-green-700",
  blocked: "text-error",
  unverified: "text-secondary",
};

const EMPTY_COUNTS: UserCounts = { all: 0, active: 0, blocked: 0, unverified: 0 };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [counts, setCounts] = useState<UserCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [sort, setSort] = useState<UserSort>("newest");
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<ManagedUser | null>(null);

  // Ignores responses that arrive after a newer request was started
  const requestId = useRef(0);

  // Debounce typing; a new search always starts on page 1
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, search]);

  const fetchUsers = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      const id = ++requestId.current;
      if (!options.quiet) setIsLoading(true);
      setError(null);
      try {
        const result = await listUsers({ search, status, page, limit: LIMIT, sort });
        if (id !== requestId.current) return;
        setUsers(result.data);
        setTotal(result.meta?.total ?? 0);
        setCounts(result.meta?.counts ?? EMPTY_COUNTS);

        // The last item on a page was removed: step back instead of showing an empty page
        if (result.data.length === 0 && page > 1 && (result.meta?.total ?? 0) > 0) {
          setPage((p) => Math.max(1, p - 1));
        }
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [search, status, page, sort],
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const changeStatus = (next: UserStatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  const handleBlockConfirm = async (reason: string) => {
    if (!blockTarget) return;
    const target = blockTarget;
    setBusyId(target._id);
    const state = await performBlock(target, reason);
    setBusyId(null);
    if (state) {
      setBlockTarget(null);
      void fetchUsers({ quiet: true });
    }
  };

  const handleUnblock = async (user: ManagedUser) => {
    setBusyId(user._id);
    const state = await confirmAndUnblock(user);
    setBusyId(null);
    if (state) void fetchUsers({ quiet: true });
  };

  const handleDelete = async (user: ManagedUser) => {
    setBusyId(user._id);
    const deleted = await confirmAndDelete(user);
    setBusyId(null);
    if (deleted) void fetchUsers({ quiet: true });
  };

  const activeFilter = FILTERS.find((f) => f.key === status);
  const hasQuery = Boolean(search) || status !== "all";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">User Management</h3>
        <p className="text-sm text-on-surface-variant">
          Review client accounts, block or restore access, and see each client&apos;s cases and appointments.
        </p>
      </header>

      {/* Status filters double as the stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist" aria-label="Filter by account status">
        {FILTERS.map((filter) => {
          const selected = status === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => changeStatus(filter.key)}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-secondary bg-secondary/10 ring-1 ring-secondary"
                  : "border-outline-variant bg-surface-container hover:border-secondary/60"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant sm:text-sm sm:normal-case sm:tracking-normal">
                {filter.label}
              </p>
              <p className={`mt-1.5 font-display text-2xl font-bold sm:text-3xl ${FILTER_ACCENTS[filter.key]}`}>
                {counts[filter.key]}
              </p>
              <p className="mt-1 hidden text-xs text-on-surface-variant sm:block">{filter.hint}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search users"
            className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-9 pr-9 text-sm text-on-surface outline-none transition focus:border-secondary"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant hover:bg-surface-container"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as UserSort);
              setPage(1);
            }}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-16 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchUsers()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold hover:bg-error/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">
            {hasQuery
              ? `No ${activeFilter && status !== "all" ? activeFilter.label.toLowerCase() + " " : ""}clients${search ? ` match "${search}"` : ""}.`
              : "No registered clients yet."}
          </p>
          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                changeStatus("all");
              }}
              className="mt-3 text-sm font-semibold text-secondary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant sm:px-4">
                    Client
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant md:table-cell">
                    Contact
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant sm:table-cell">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant lg:table-cell">
                    Joined
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-on-surface-variant sm:px-4">
                    <span className="sr-only sm:not-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant bg-surface">
                {users.map((user) => {
                  const busy = busyId === user._id;
                  return (
                    <tr key={user._id} className={`transition hover:bg-surface-container/50 ${busy ? "opacity-60" : ""}`}>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={user.name} imageUrl={user.profileImageUrl} />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/admin/users/${user._id}`}
                              className="block truncate font-medium text-on-surface hover:text-secondary"
                            >
                              {user.name}
                            </Link>
                            <p className="truncate text-xs text-on-surface-variant md:hidden">{user.email}</p>
                            <div className="mt-1 sm:hidden">
                              <UserStatusBadge user={user} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <p className="flex items-center gap-1.5 text-on-surface-variant">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                        {user.phone && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {user.phone}
                          </p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <UserStatusBadge user={user} />
                        {user.isBlocked && user.blockedAt && (
                          <p className="mt-1 text-xs text-on-surface-variant">since {formatDate(user.blockedAt)}</p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-on-surface-variant lg:table-cell">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/admin/users/${user._id}`}
                            title="View details"
                            aria-label={`View details for ${user.name}`}
                            className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {user.isBlocked ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleUnblock(user)}
                              title="Unblock"
                              aria-label={`Unblock ${user.name}`}
                              className="rounded-lg p-2 text-green-700 transition hover:bg-green-500/10 disabled:opacity-40"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setBlockTarget(user)}
                              title="Block"
                              aria-label={`Block ${user.name}`}
                              className="rounded-lg p-2 text-on-surface-variant transition hover:bg-error/10 hover:text-error disabled:opacity-40"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(user)}
                            title="Delete"
                            aria-label={`Delete ${user.name}`}
                            className="rounded-lg p-2 text-on-surface-variant transition hover:bg-error/10 hover:text-error disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 text-sm text-on-surface-variant sm:flex-row">
            <span>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <BlockUserDialog user={blockTarget} onConfirm={handleBlockConfirm} onClose={() => setBlockTarget(null)} />
    </div>
  );
}
