"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Eye, RotateCcw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import {
  formatDate,
  listUsers,
  type ManagedUser,
  type UserCounts,
  type UserSort,
  type UserStatusFilter,
} from "../../../../lib/adminUsers";
import { BlockUserDialog } from "./_components/BlockUserDialog";
import { Pagination } from "../../../../components/Pagination";
import { UserAvatar, UserStatusBadge, confirmAndDelete, confirmAndUnblock, performBlock } from "./_components/userActions";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 350;

const FILTERS: { key: UserStatusFilter; label: string; hint: string }[] = [
  { key: "all", label: "All clients", hint: "Every registered client" },
  { key: "active", label: "Active", hint: "Verified and not blocked" },
  { key: "blocked", label: "Blocked", hint: "Cannot log in" },
  { key: "unverified", label: "Unverified", hint: "Email not confirmed yet" },
];

// Small status dot inside each filter chip
const FILTER_DOTS: Record<UserStatusFilter, string | null> = {
  all: null,
  active: "bg-success",
  blocked: "bg-error",
  unverified: "bg-secondary",
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

      {/* Status filters, each with its count */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by account status">
        {FILTERS.map((filter) => {
          const selected = status === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => changeStatus(filter.key)}
              title={filter.hint}
              className={`chip ${selected ? "chip-active" : ""}`}
            >
              {FILTER_DOTS[filter.key] && (
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${FILTER_DOTS[filter.key]}`} />
              )}
              {filter.label}
              <span className="tabular-nums opacity-70">{counts[filter.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search users"
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
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as UserSort);
              setPage(1);
            }}
            className="field w-auto"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="card h-80 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchUsers()}
            className="btn btn-secondary btn-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="card p-10 text-center">
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
              className="btn btn-secondary btn-sm mt-4"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-on-surface-variant sm:px-4">
                    Client
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-semibold text-on-surface-variant md:table-cell">
                    Contact
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-semibold text-on-surface-variant sm:table-cell">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-sm font-semibold text-on-surface-variant lg:table-cell">
                    Joined
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-on-surface-variant sm:px-4">
                    <span className="sr-only sm:not-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.map((user) => {
                  const busy = busyId === user._id;
                  return (
                    <tr key={user._id} className={`transition-colors hover:bg-surface-container/60 ${busy ? "opacity-60" : ""}`}>
                      <td className="px-3 py-3.5 sm:px-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={user.name} imageUrl={user.profileImageUrl} />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/admin/users/${user._id}`}
                              className="block truncate font-semibold text-on-surface hover:text-gold-ink"
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
                        <p className="truncate text-on-surface">{user.email}</p>
                        {user.phone && (
                          <p className="mt-0.5 text-on-surface-variant tabular-nums">
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
                      <td className="hidden px-4 py-3 text-on-surface-variant lg:table-cell">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-end">
                          <Link
                            href={`/dashboard/admin/users/${user._id}`}
                            title="View details"
                            aria-label={`View details for ${user.name}`}
                            className="btn btn-ghost btn-icon"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {user.isBlocked ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleUnblock(user)}
                              title="Unblock"
                              aria-label={`Unblock ${user.name}`}
                              className="btn btn-ghost btn-icon text-success hover:text-success"
                            >
                              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setBlockTarget(user)}
                              title="Block"
                              aria-label={`Block ${user.name}`}
                              className="btn btn-ghost btn-icon hover:text-error"
                            >
                              <Ban className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(user)}
                            title="Delete"
                            aria-label={`Delete ${user.name}`}
                            className="btn btn-ghost btn-icon hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={LIMIT} total={total} onPageChange={setPage} />
        </>
      )}

      <BlockUserDialog user={blockTarget} onConfirm={handleBlockConfirm} onClose={() => setBlockTarget(null)} />
    </div>
  );
}
