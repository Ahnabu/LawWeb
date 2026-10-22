"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, Loader2, Plus, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "../../../../components/Pagination";
import { formatDate } from "../../../../lib/adminUsers";
import {
  createStaff,
  listRoles,
  listStaff,
  type StaffCounts,
  type StaffMember,
  type StaffRole,
  type StaffStatusFilter,
} from "../../../../lib/adminAccess";
import { UserAvatar, UserStatusBadge } from "../users/_components/userActions";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 350;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-()]*$/;

const FILTERS: { key: StaffStatusFilter; label: string; dot: string | null }[] = [
  { key: "all", label: "All staff", dot: null },
  { key: "active", label: "Active", dot: "bg-success" },
  { key: "blocked", label: "Blocked", dot: "bg-error" },
];

const EMPTY_COUNTS: StaffCounts = { all: 0, active: 0, blocked: 0 };

export default function AdminTeamPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [counts, setCounts] = useState<StaffCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StaffStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

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

  const fetchStaff = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      const id = ++requestId.current;
      if (!options.quiet) setIsLoading(true);
      setError(null);
      try {
        const result = await listStaff({ search, status, page, limit: LIMIT });
        if (id !== requestId.current) return;
        setStaff(result.data);
        setTotal(result.meta?.total ?? 0);
        setCounts(result.meta?.counts ?? EMPTY_COUNTS);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to load staff");
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [search, status, page],
  );

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    listRoles()
      .then(setRoles)
      .catch(() => {
        /* the add dialog then offers "No role" only */
      });
  }, []);

  const hasQuery = Boolean(search) || status !== "all";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Team</h3>
          <p className="text-sm text-on-surface-variant">
            Staff accounts for firm employees. Each has one{" "}
            <Link href="/dashboard/admin/roles" className="text-link">
              role
            </Link>{" "}
            that decides which admin pages they can use.
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add staff
        </button>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by account status">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={status === filter.key}
            onClick={() => {
              setStatus(filter.key);
              setPage(1);
            }}
            className={`chip ${status === filter.key ? "chip-active" : ""}`}
          >
            {filter.dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${filter.dot}`} />}
            {filter.label}
            <span className="tabular-nums opacity-70">{counts[filter.key]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email or phone"
          aria-label="Search staff"
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

      {isLoading ? (
        <div className="card h-64 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchStaff()} className="btn btn-secondary btn-sm">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : staff.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            {hasQuery
              ? `No ${status !== "all" ? `${status} ` : ""}staff${search ? ` match "${search}"` : ""}.`
              : "No staff accounts yet. Add one to give an employee their own login."}
          </p>
          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setStatus("all");
                setPage(1);
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
                  <th className="px-3 py-3 text-left font-semibold text-on-surface-variant sm:px-4">Staff member</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-on-surface-variant md:table-cell">Role</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-on-surface-variant sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-on-surface-variant lg:table-cell">Last active</th>
                  <th className="px-3 py-3 text-right font-semibold text-on-surface-variant sm:px-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {staff.map((member) => (
                  <tr key={member._id} className="transition-colors hover:bg-surface-container/60">
                    <td className="px-3 py-3.5 sm:px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={member.name} />
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/admin/team/${member._id}`}
                            className="block truncate font-semibold text-on-surface hover:text-gold-ink"
                          >
                            {member.name}
                          </Link>
                          <p className="truncate text-xs text-on-surface-variant">{member.email}</p>
                          <p className="truncate text-xs text-on-surface-variant md:hidden">
                            {member.staffRoleId?.name ?? "No role"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {member.staffRoleId?.name ?? <span className="text-on-surface-variant">No role</span>}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <UserStatusBadge user={member} />
                    </td>
                    <td className="hidden px-4 py-3 text-on-surface-variant lg:table-cell">
                      {member.lastActiveAt ? formatDate(member.lastActiveAt, true) : "Not signed in"}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex justify-end">
                        <Link
                          href={`/dashboard/admin/team/${member._id}`}
                          title="View details"
                          aria-label={`View details for ${member.name}`}
                          className="btn btn-ghost btn-icon"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={LIMIT} total={total} onPageChange={setPage} />
        </>
      )}

      {showAdd && (
        <AddStaffDialog
          roles={roles}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            void fetchStaff({ quiet: true });
          }}
        />
      )}
    </div>
  );
}

function AddStaffDialog({
  roles,
  onClose,
  onCreated,
}: {
  roles: StaffRole[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", staffRoleId: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (name.length < 2) return setFormError("Enter their full name.");
    if (!EMAIL_PATTERN.test(email)) return setFormError("Enter a valid email address.");
    if (phone && !PHONE_PATTERN.test(phone)) return setFormError("Enter a valid phone number.");

    setFormError(null);
    setIsSaving(true);
    try {
      const result = await createStaff({ name, email, phone: phone || undefined, staffRoleId: form.staffRoleId || null });
      if (result.emailSent === false) toast.warning(result.message);
      else toast.success(result.message || "Staff account created");
      onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add staff member");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.55)] p-4 pt-12 sm:pt-16"
      onMouseDown={() => !isSaving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-staff-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <h3 id="add-staff-title" className="font-display text-lg font-semibold text-on-surface">
            Add staff member
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} disabled={isSaving} className="btn btn-ghost btn-icon -mr-2">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {formError && (
              <p className="notice notice-error" role="alert">
                {formError}
              </p>
            )}
            <label className="block">
              <span className="label">
                Full name <span className="text-error">*</span>
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={100}
                className="field"
                autoFocus
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">
                  Email <span className="text-error">*</span>
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="label">Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  maxLength={30}
                  className="field"
                />
              </label>
            </div>
            <label className="block">
              <span className="label">Role</span>
              <select
                value={form.staffRoleId}
                onChange={(e) => setForm((f) => ({ ...f, staffRoleId: e.target.value }))}
                className="field"
              >
                <option value="">No role yet (no access)</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {roles.length === 0 && (
                <span className="hint">
                  No roles yet.{" "}
                  <Link href="/dashboard/admin/roles" className="text-link">
                    Create one
                  </Link>{" "}
                  first, or add the role later.
                </span>
              )}
            </label>
            <p className="text-sm text-on-surface-variant">
              They get an email with a link to set their password. The email must not belong to any other account.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={isSaving} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSaving ? "Adding…" : "Add staff member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
