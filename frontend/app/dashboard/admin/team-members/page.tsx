"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "../../../../components/Pagination";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import {
  createTeamMember,
  deleteTeamMember,
  listAdminTeamMembers,
  reorderTeamMembers,
  updateTeamMember,
  uploadTeamMemberPhoto,
  type TeamMember,
  type TeamMemberInput,
} from "../../../../lib/teamMembers";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 350;

const EMPTY_FORM: TeamMemberInput = {
  name: "",
  role: "",
  photoUrl: "",
  phone: "",
  email: "",
  bio: "",
  isVisible: true,
};

export default function AdminTeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, visible: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const fetchMembers = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      const id = ++requestId.current;
      if (!options.quiet) setIsLoading(true);
      setError(null);
      try {
        const result = await listAdminTeamMembers({ search, page, limit: LIMIT });
        if (id !== requestId.current) return;
        setMembers(result.data);
        setTotal(result.meta?.total ?? 0);
        setCounts({
          all: result.meta?.counts.all ?? 0,
          visible: result.meta?.counts.visible ?? 0,
        });
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to load the team");
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [search, page],
  );

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const toggleVisibility = async (member: TeamMember) => {
    setBusyId(member._id);
    try {
      const { data } = await updateTeamMember(member._id, { isVisible: !member.isVisible });
      setMembers((prev) => prev.map((m) => (m._id === member._id ? { ...m, isVisible: data.isVisible } : m)));
      toast.success(data.isVisible ? "Shown on the public team page" : "Hidden from the public team page");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update the team member");
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (member: TeamMember) => {
    const confirmed = await confirmDialog({
      title: `Remove ${member.name}?`,
      message: "They are removed from the public team page. This cannot be undone.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusyId(member._id);
    try {
      await deleteTeamMember(member._id);
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
      toast.success("Team member removed");
      void fetchMembers({ quiet: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the team member");
    } finally {
      setBusyId(null);
    }
  };

  const moveMember = async (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setMembers(next);
    try {
      await reorderTeamMembers(next.map((m) => m._id));
      toast.success("Order saved", { id: "team-order" });
    } catch (err) {
      setMembers(members);
      toast.error(err instanceof Error ? err.message : "Could not save the order.", { id: "team-order" });
    }
  };

  const closeDialog = () => {
    setEditing(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Team Members</h3>
          <p className="text-sm text-on-surface-variant">
            The admins and staff shown under the lawyers on the public Team page. The role is free text.
          </p>
        </div>
        <button type="button" onClick={() => setIsCreating(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add team member
        </button>
      </header>

      {!isLoading && !error && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {[["Total", counts.all], ["Shown on the site", counts.visible]].map(([label, value]) => (
            <div key={label as string} className="flex items-baseline gap-1.5">
              <dt className="text-on-surface-variant">{label}</dt>
              <dd className="font-semibold text-on-surface tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, role, email or phone"
          aria-label="Search team members"
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
          <button type="button" onClick={() => void fetchMembers()} className="btn btn-secondary btn-sm">
            Try again
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            {search
              ? `No team members match "${search}".`
              : "No team members yet. Add one to show them under the lawyers on the public team page."}
          </p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-outline-variant">
              {members.map((member, index) => {
                const initials = member.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li key={member._id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                    <div className="flex shrink-0 flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => void moveMember(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${member.name} up`}
                        className="flex h-7 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveMember(index, 1)}
                        disabled={index === members.length - 1}
                        aria-label={`Move ${member.name} down`}
                        className="flex h-7 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-full border border-outline-variant object-cover"
                      />
                    ) : (
                      <span className="monogram h-12 w-12 shrink-0 text-sm">{initials}</span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-on-surface">{member.name}</p>
                        <span className="chip">
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${member.isVisible ? "bg-success" : "bg-outline"}`}
                          />
                          {member.isVisible ? "Shown" : "Hidden"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-on-surface-variant">{member.role}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
                        {member.phone && <span>{member.phone}</span>}
                        {member.email && <span className="break-all">{member.email}</span>}
                        {member.bio && <span className="line-clamp-1">{member.bio}</span>}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditing(member)}
                        className="btn btn-secondary btn-sm mr-1"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleVisibility(member)}
                        disabled={busyId === member._id}
                        title={member.isVisible ? "Hide from the public team page" : "Show on the public team page"}
                        className="btn btn-ghost btn-icon"
                      >
                        {member.isVisible ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {member.isVisible ? `Hide ${member.name}` : `Show ${member.name}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeMember(member)}
                        disabled={busyId === member._id}
                        title="Remove team member"
                        className="btn btn-ghost btn-icon hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Remove {member.name}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <Pagination page={page} pageSize={LIMIT} total={total} onPageChange={setPage} />
        </>
      )}

      {(editing || isCreating) && (
        <TeamMemberDialog
          member={editing}
          onClose={closeDialog}
          onSaved={() => {
            closeDialog();
            void fetchMembers({ quiet: true });
          }}
        />
      )}
    </div>
  );
}

// ── Add / edit dialog ─────────────────────────────────────────────────────────

function TeamMemberDialog({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TeamMemberInput>(() =>
    member
      ? {
          name: member.name,
          role: member.role,
          photoUrl: member.photoUrl ?? "",
          phone: member.phone ?? "",
          email: member.email ?? "",
          bio: member.bio ?? "",
          isVisible: member.isVisible ?? true,
        }
      : EMPTY_FORM,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const uploadPhoto = async (file: File) => {
    setIsUploading(true);
    try {
      const { url } = await uploadTeamMemberPhoto(file);
      setForm((f) => ({ ...f, photoUrl: url }));
      setImageFailed(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The photo could not be uploaded");
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const role = form.role.trim();
    if (name.length < 2) return setFormError("Enter their full name.");
    if (!role) return setFormError("Enter the role shown on the card.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setFormError("Enter a valid email address.");
    }

    setFormError(null);
    setIsSaving(true);
    const payload: TeamMemberInput = {
      name,
      role,
      photoUrl: form.photoUrl?.trim() || "",
      phone: form.phone?.trim() || "",
      email: form.email?.trim() || "",
      bio: form.bio?.trim() || "",
      isVisible: form.isVisible ?? true,
    };
    try {
      if (member) {
        await updateTeamMember(member._id, payload);
        toast.success("Team member saved");
      } else {
        await createTeamMember(payload);
        toast.success("Team member added");
      }
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save the team member";
      setFormError(message);
      toast.error(message);
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
        aria-labelledby="team-member-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <h3 id="team-member-dialog-title" className="font-display text-lg font-semibold text-on-surface">
            {member ? "Edit team member" : "Add team member"}
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

            {/* Photo */}
            <div>
              <span className="label">Photo</span>
              {form.photoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-outline-variant bg-surface-container">
                    {imageFailed ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
                      </div>
                    ) : (
                      <Image
                        src={form.photoUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                    className="btn btn-secondary btn-sm"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                  className="panel flex w-full items-center justify-center gap-2 py-6 text-sm text-on-surface-variant transition-colors hover:border-outline hover:text-on-surface disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Uploading…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5" aria-hidden="true" /> Click to upload a photo
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  e.target.value = "";
                }}
              />
              <span className="hint">JPG, PNG or WebP, up to 5 MB.</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="block">
                <span className="label">
                  Role <span className="text-error">*</span>
                </span>
                <input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  maxLength={120}
                  placeholder="e.g. Office Manager"
                  className="field"
                />
                <span className="hint">Any text the firm wants to show.</span>
              </label>
              <label className="block">
                <span className="label">Contact number</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  maxLength={30}
                  placeholder="+880 1712-345678"
                  className="field"
                />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  maxLength={254}
                  placeholder="name@example.com"
                  className="field"
                />
              </label>
            </div>

            <label className="block">
              <span className="label">Short note</span>
              <input
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                maxLength={500}
                placeholder="One line under the name (optional)"
                className="field"
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={form.isVisible ?? true}
                onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded"
              />
              <span>
                Show on the public team page
                <span className="block text-xs text-on-surface-variant">
                  Hidden members stay here and keep their place in the order.
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={isSaving} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSaving ? "Saving…" : member ? "Save changes" : "Add team member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
