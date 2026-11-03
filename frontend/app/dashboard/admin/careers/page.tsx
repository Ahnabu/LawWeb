"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "../../../../components/RichTextEditor";
import { Pagination } from "../../../../components/Pagination";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import {
  createCareer,
  deleteCareer,
  listAdminCareers,
  updateCareer,
  type CareerInput,
  type CareerOpening,
  type CareerStatus,
  type EmploymentType,
  type WorkplaceType,
} from "../../../../lib/careers";
import { richTextToPlain } from "../../../../lib/richText";

const PAGE_SIZE = 20;

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full time" },
  { value: "part-time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const WORKPLACE_TYPES: { value: WorkplaceType; label: string }[] = [
  { value: "on-site", label: "On site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const STATUSES: { value: CareerStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
];

const emptyForm = (): CareerInput => ({
  title: "",
  department: "",
  employmentType: "full-time",
  workplaceType: "on-site",
  location: "",
  experience: "",
  salary: "",
  deadline: "",
  description: "",
  requirements: "",
  applicationEmail: "",
  applicationUrl: "",
  applicationInstructions: "",
  status: "draft",
});

export default function AdminCareersPage() {
  const [openings, setOpenings] = useState<CareerOpening[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<CareerOpening | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput, search]);

  const fetchOpenings = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      const id = ++requestId.current;
      if (!options.quiet) setIsLoading(true);
      setError(null);
      try {
        const result = await listAdminCareers({ status, search, page, limit: PAGE_SIZE });
        if (id !== requestId.current) return;
        setOpenings(result.data);
        setTotal(result.meta?.total ?? 0);
        setCounts(result.meta?.counts ?? {});
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to load the openings");
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [status, search, page],
  );

  useEffect(() => {
    void fetchOpenings();
  }, [fetchOpenings]);

  const removeOpening = async (opening: CareerOpening) => {
    const confirmed = await confirmDialog({
      title: `Delete "${opening.title}"?`,
      message: "The opening is removed from the site. This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusyId(opening._id);
    try {
      await deleteCareer(opening._id);
      toast.success("Opening deleted");
      void fetchOpenings({ quiet: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the opening");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Careers</h3>
          <p className="text-sm text-on-surface-variant">
            The openings on the public Careers page. Published openings appear there right away.
          </p>
        </div>
        <button type="button" onClick={() => setIsCreating(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New opening
        </button>
      </header>

      {!isLoading && !error && Object.keys(counts).length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {STATUSES.map((option) => (
            <div key={option.value} className="flex items-baseline gap-1.5">
              <dt className="text-on-surface-variant">{option.label}</dt>
              <dd className="font-semibold text-on-surface tabular-nums">{counts[option.value] ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, department or location"
            aria-label="Search openings"
            className="field pl-9 pr-9"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={status === "all"}
            onClick={() => {
              setStatus("all");
              setPage(1);
            }}
            className="chip"
          >
            All
          </button>
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => {
                setStatus(option.value);
                setPage(1);
              }}
              className="chip"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card h-64 animate-pulse bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchOpenings()} className="btn btn-secondary btn-sm">
            Try again
          </button>
        </div>
      ) : openings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            {search ? `No openings match "${search}".` : "No openings yet. Create one to publish a job on the site."}
          </p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-outline-variant">
              {openings.map((opening) => (
                <li key={opening._id} className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-on-surface">{opening.title}</p>
                      <span className="chip">
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            opening.status === "published"
                              ? "bg-success"
                              : opening.status === "closed"
                                ? "bg-error"
                                : "bg-outline"
                          }`}
                        />
                        {STATUSES.find((s) => s.value === opening.status)?.label ?? opening.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      {opening.department}
                      {opening.location ? ` · ${opening.location}` : ""}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-on-surface-variant">
                      {richTextToPlain(opening.description, 120)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    {opening.status === "published" && (
                      <Link
                        href={`/careers/${opening.slug}`}
                        target="_blank"
                        className="btn btn-ghost btn-icon"
                        title="Open the public page"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Open the public page for {opening.title}</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(opening)}
                      className="btn btn-secondary btn-sm mr-1"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeOpening(opening)}
                      disabled={busyId === opening._id}
                      title="Delete opening"
                      className="btn btn-ghost btn-icon hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Delete {opening.title}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      {(editing || isCreating) && (
        <CareerDialog
          opening={editing}
          onClose={() => {
            setEditing(null);
            setIsCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setIsCreating(false);
            void fetchOpenings({ quiet: true });
          }}
        />
      )}
    </div>
  );
}

// ── Add / edit dialog ─────────────────────────────────────────────────────────

function CareerDialog({
  opening,
  onClose,
  onSaved,
}: {
  opening: CareerOpening | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CareerInput>(() =>
    opening
      ? {
          title: opening.title,
          department: opening.department,
          employmentType: opening.employmentType,
          workplaceType: opening.workplaceType,
          location: opening.location ?? "",
          experience: opening.experience ?? "",
          salary: opening.salary ?? "",
          deadline: opening.deadline ? opening.deadline.slice(0, 10) : "",
          description: opening.description,
          requirements: opening.requirements,
          applicationEmail: opening.applicationEmail ?? "",
          applicationUrl: opening.applicationUrl ?? "",
          applicationInstructions: opening.applicationInstructions ?? "",
          status: opening.status,
        }
      : emptyForm(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const set = <K extends keyof CareerInput>(key: K, value: CareerInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (title.length < 3) return setFormError("Enter the job title.");
    if (!richTextToPlain(form.description)) return setFormError("Write the job description.");
    if (form.applicationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.applicationEmail.trim())) {
      return setFormError("Enter a valid email address for applications.");
    }
    if (form.applicationUrl && !/^https:\/\/.+/.test(form.applicationUrl.trim())) {
      return setFormError("The application link must start with https://");
    }

    setFormError(null);
    setIsSaving(true);
    const payload: CareerInput = {
      ...form,
      title,
      department: form.department.trim(),
      location: form.location.trim(),
      experience: form.experience.trim(),
      salary: form.salary.trim(),
      deadline: form.deadline,
      applicationEmail: form.applicationEmail.trim(),
      applicationUrl: form.applicationUrl.trim(),
    };
    try {
      if (opening) {
        await updateCareer(opening._id, payload);
        toast.success("Opening saved");
      } else {
        await createCareer(payload);
        toast.success("Opening created");
      }
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save the opening";
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
        aria-labelledby="career-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-4xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <h3 id="career-dialog-title" className="font-display text-lg font-semibold text-on-surface">
            {opening ? "Edit opening" : "New opening"}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="label">
                  Job title <span className="text-error">*</span>
                </span>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={160}
                  placeholder="e.g. Senior Associate, Corporate"
                  className="field"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="label">Department</span>
                <input
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Corporate & Commercial"
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Employment type</span>
                <select
                  value={form.employmentType}
                  onChange={(e) => set("employmentType", e.target.value as EmploymentType)}
                  className="field"
                >
                  {EMPLOYMENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label">Workplace</span>
                <select
                  value={form.workplaceType}
                  onChange={(e) => set("workplaceType", e.target.value as WorkplaceType)}
                  className="field"
                >
                  {WORKPLACE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label">Location</span>
                <input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Dhaka, Bangladesh"
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Experience</span>
                <input
                  value={form.experience}
                  onChange={(e) => set("experience", e.target.value)}
                  maxLength={120}
                  placeholder="e.g. 3 to 5 years"
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Salary</span>
                <input
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Negotiable"
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Application deadline</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => set("deadline", e.target.value)}
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as CareerStatus)}
                  className="field"
                >
                  {STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="hint">Only published openings show on the public page.</span>
              </label>
            </div>

            <div className="space-y-1">
              <span className="label">
                Description <span className="text-error">*</span>
              </span>
              <RichTextEditor
                value={form.description}
                onChange={(value) => set("description", value)}
                placeholder="What the role is about, the day-to-day work, and who you are looking for..."
                minHeightClass="min-h-44"
              />
            </div>

            <div className="space-y-1">
              <span className="label">Requirements</span>
              <RichTextEditor
                value={form.requirements}
                onChange={(value) => set("requirements", value)}
                placeholder="Qualifications, skills and experience needed..."
                minHeightClass="min-h-36"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Application email</span>
                <input
                  type="email"
                  value={form.applicationEmail}
                  onChange={(e) => set("applicationEmail", e.target.value)}
                  maxLength={254}
                  placeholder="careers@example.com"
                  className="field"
                />
                <span className="hint">Applicants send their CV to this address.</span>
              </label>
              <label className="block">
                <span className="label">Online application link</span>
                <input
                  type="url"
                  value={form.applicationUrl}
                  onChange={(e) => set("applicationUrl", e.target.value)}
                  maxLength={500}
                  placeholder="https://forms.example.com/apply"
                  className="field"
                />
                <span className="hint">Optional. Must start with https://</span>
              </label>
            </div>

            <div className="space-y-1">
              <span className="label">How to apply</span>
              <RichTextEditor
                value={form.applicationInstructions}
                onChange={(value) => set("applicationInstructions", value)}
                placeholder="Tell applicants what to send: a CV, a cover letter, their bar council certificate..."
                minHeightClass="min-h-32"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant px-5 py-4 sm:px-6">
            <Link href="/careers" target="_blank" className="text-link inline-flex min-h-8 items-center gap-1 text-sm">
              View the public page
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={isSaving} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? "Saving…" : opening ? "Save changes" : "Create opening"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
