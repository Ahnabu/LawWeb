"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus, X, ShieldCheck, ShieldOff, Pencil, User,
  GripVertical, ChevronUp, ChevronDown, Loader2, Camera,
  Ban, LockOpen, Archive, CalendarX, UserX, RotateCcw, AlertTriangle, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type Announcements, type DragEndEvent, type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import { useAccess } from "../../../../components/useAccess";
import { summarizePermissions } from "../../../../lib/delegation";
import {
  addAdminLawyer, blockAdminUser, deleteAdminLawyer, getAdminLawyerDetails, getAdminLawyers,
  getLawyerDeletionImpact, reorderAdminLawyers, restoreAdminLawyer, toggleLawyerVerification, unblockAdminUser,
  updateAdminLawyer, uploadAdminLawyerPhoto,
  type AdminLawyer, type AdminLawyerCounts, type AdminLawyerDetails, type LawyerDeletionImpact,
} from "../../../../lib/dashboard";
import { compressImage } from "../../../../lib/imageCompression";
import { formatFee } from "../../../../lib/fees";

// Matches the backend profile-photo upload (Cloudinary crops it to 500×500)
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

interface LawyerFormValues {
  name: string;
  email: string;
  phone: string;
  barId: string;
  specialization: string;
  designationEn: string;
  designationBn: string;
  feeBdt: string;
  feeUsd: string;
}

type FormErrors = Partial<Record<keyof LawyerFormValues, string>>;

const EMPTY_FORM: LawyerFormValues = {
  name: "", email: "", phone: "", barId: "", specialization: "", designationEn: "", designationBn: "",
  feeBdt: "", feeUsd: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FEE_MAX = 10_000_000;

const feeError = (value: string) => {
  if (!value.trim()) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= FEE_MAX ? undefined : "Enter an amount from 0 to 10,000,000.";
};

// "" clears the fee
const toFee = (value: string) => (value.trim() ? Number(value) : null);
const PHONE_PATTERN = /^[+\d][\d\s()-]{4,29}$/;

function validateLawyerForm(values: LawyerFormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > 100) errors.name = "Enter the lawyer's full name (2–100 characters).";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!PHONE_PATTERN.test(values.phone.trim())) errors.phone = "Enter a valid phone number, e.g. +8801XXXXXXXXX.";
  if (!values.barId.trim()) errors.barId = "Bar ID is required.";
  else if (values.barId.trim().length > 50) errors.barId = "Bar ID must be at most 50 characters.";
  if (values.specialization.trim().length > 200) errors.specialization = "Keep it under 200 characters.";
  if (values.designationEn.trim().length > 120) errors.designationEn = "Keep it under 120 characters.";
  if (values.designationBn.trim().length > 120) errors.designationBn = "Keep it under 120 characters.";
  errors.feeBdt = feeError(values.feeBdt);
  errors.feeUsd = feeError(values.feeUsd);
  return errors;
}

const isPublic = (l: AdminLawyer) => l.isVerified && !l.isBlocked;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Rows only move up and down
const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type LawyerView = "current" | "removed";
type BusyAction = "verify" | "block" | "delete" | "restore";

export default function AdminLawyersPage() {
  // Roles with lawyers.view only get a read-only list (the API refuses the rest).
  // Blocking goes through the users endpoints, which also need clients.manage.
  const access = useAccess();
  const canManage = access.can("lawyers.manage");
  const canBlock = canManage && access.can("clients.manage");

  const [view, setView] = useState<LawyerView>("current");
  const [lawyers, setLawyers] = useState<AdminLawyer[]>([]);
  // Removed (soft-deleted) lawyers, loaded when the Removed tab opens
  const [removedLawyers, setRemovedLawyers] = useState<AdminLawyer[]>([]);
  const [counts, setCounts] = useState<AdminLawyerCounts>({ current: 0, removed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: BusyAction } | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Add / edit modal
  const [formMode, setFormMode] = useState<{ type: "add" } | { type: "edit"; lawyer: AdminLawyer } | null>(null);

  // Details modal
  const [detailsLawyer, setDetailsLawyer] = useState<AdminLawyerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const fetchLawyers = useCallback(async (options: { quiet?: boolean } = {}) => {
    if (!options.quiet) setIsLoading(true);
    setError(null);
    try {
      const { lawyers: rows, counts: nextCounts } = await getAdminLawyers({ removed: view === "removed" });
      if (view === "removed") setRemovedLawyers(rows);
      else setLawyers(rows);
      if (nextCounts) setCounts(nextCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lawyers");
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  useEffect(() => { void fetchLawyers(); }, [fetchLawyers]);

  // Applies a server update to the list and the open details modal
  const patchLawyer = (id: string, patch: Partial<AdminLawyer>) => {
    setLawyers((prev) => prev.map((l) => (l._id === id ? { ...l, ...patch } : l)));
    setDetailsLawyer((prev) => (prev?._id === id ? { ...prev, ...patch } : prev));
  };

  const openDetails = async (id: string) => {
    setDetailsLawyer(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const { data } = await getAdminLawyerDetails(id);
      setDetailsLawyer(data);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => { setDetailsLawyer(null); setDetailsError(null); setDetailsLoading(false); };

  // ── Ordering ──────────────────────────────────────────────────────────────
  const saveOrder = async (next: AdminLawyer[], previous: AdminLawyer[]) => {
    setLawyers(next);
    setIsSavingOrder(true);
    try {
      const { message, data } = await reorderAdminLawyers(next.map((l) => l._id));
      const positions = new Map(data.map((d) => [d._id, d.sortOrder]));
      setLawyers((current) => current.map((l) => ({ ...l, sortOrder: positions.get(l._id) ?? l.sortOrder })));
      // Same id: rapid moves update one toast instead of stacking several
      toast.success(message || "Lawyer order saved", { id: "lawyer-order" });
    } catch (err) {
      setLawyers(previous);
      toast.error(err instanceof Error ? `${err.message} The previous order was restored.` : "Could not save the order.", {
        id: "lawyer-order",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const moveLawyer = (id: string, offset: -1 | 1) => {
    const from = lawyers.findIndex((l) => l._id === id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= lawyers.length || isSavingOrder) return;
    void saveOrder(arrayMove(lawyers, from, to), lawyers);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = lawyers.findIndex((l) => l._id === active.id);
    const to = lawyers.findIndex((l) => l._id === over.id);
    if (from < 0 || to < 0) return;
    void saveOrder(arrayMove(lawyers, from, to), lawyers);
  };

  const nameOf = useCallback(
    (id: string | number) => lawyers.find((l) => l._id === id)?.name ?? "Lawyer",
    [lawyers],
  );
  const positionOf = useCallback((id: string | number) => lawyers.findIndex((l) => l._id === id) + 1, [lawyers]);

  const announcements = useMemo<Announcements>(() => ({
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, position ${positionOf(active.id)} of ${lawyers.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} moved to position ${positionOf(over.id)} of ${lawyers.length}.` : `${nameOf(active.id)} is not over a position.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at position ${positionOf(over.id)}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  }), [nameOf, positionOf, lawyers.length]);

  // ── Row actions ───────────────────────────────────────────────────────────
  const toggleVerification = async (lawyer: AdminLawyer) => {
    setBusy({ id: lawyer._id, action: "verify" });
    try {
      const { message, data } = await toggleLawyerVerification(lawyer._id);
      patchLawyer(lawyer._id, { isVerified: data.isVerified });
      toast.success(message || (data.isVerified ? "Lawyer verified" : "Lawyer verification removed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleBlock = async (lawyer: AdminLawyer) => {
    if (!lawyer.isBlocked) {
      const confirmed = await confirmDialog({
        title: `Block ${lawyer.name}?`,
        message:
          "They are signed out everywhere and cannot log in until unblocked. Their profile is hidden from the public site and clients cannot book them. Their cases and existing appointments stay as they are.",
        confirmLabel: "Block lawyer",
        tone: "danger",
      });
      if (!confirmed) return;
    }
    setBusy({ id: lawyer._id, action: "block" });
    try {
      const { message, data } = lawyer.isBlocked
        ? await unblockAdminUser(lawyer._id)
        : await blockAdminUser(lawyer._id);
      patchLawyer(lawyer._id, {
        isBlocked: data?.isBlocked ?? !lawyer.isBlocked,
        blockedAt: data?.blockedAt ?? undefined,
        blockedReason: data?.blockedReason ?? undefined,
      });
      toast.success(message || (lawyer.isBlocked ? `${lawyer.name} was unblocked` : `${lawyer.name} was blocked`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the account");
    } finally {
      setBusy(null);
    }
  };

  const deleteLawyer = async (lawyer: AdminLawyer) => {
    setBusy({ id: lawyer._id, action: "delete" });
    try {
      let impact: LawyerDeletionImpact;
      try {
        impact = (await getLawyerDeletionImpact(lawyer._id)).data;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not check what deleting this lawyer affects");
        return;
      }

      const confirmed = await confirmDialog({
        title: `Remove ${lawyer.name} from the firm?`,
        message:
          "They can no longer sign in, are hidden from the public site and cannot be booked or given cases. " +
          "Their account and history are kept, and you can restore them later from the Removed tab. Here is what happens now:",
        confirmLabel: "Remove lawyer",
        tone: "danger",
        details: <DeletionImpactDetails impact={impact} />,
        confirmPhrase: lawyer.email,
      });
      if (!confirmed) return;

      const { message, data } = await deleteAdminLawyer(lawyer._id);
      setLawyers((prev) => prev.filter((l) => l._id !== lawyer._id));
      setCounts((prev) => ({ current: Math.max(0, prev.current - 1), removed: prev.removed + 1 }));
      setDetailsLawyer((prev) => (prev?._id === lawyer._id ? null : prev));
      if (data?.pending) toast.warning(message);
      else toast.success(message || `${lawyer.name} was removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the lawyer");
      // The removal may have gone through even though the clean-up failed
      void fetchLawyers({ quiet: true });
    } finally {
      setBusy(null);
    }
  };

  // Re-runs the removal clean-up for a lawyer whose removal did not finish
  const finishRemoval = async (lawyer: AdminLawyer) => {
    setBusy({ id: lawyer._id, action: "delete" });
    try {
      const { message, data } = await deleteAdminLawyer(lawyer._id);
      setRemovedLawyers((prev) => prev.map((l) => (l._id === lawyer._id ? { ...l, deletionPending: data?.pending } : l)));
      if (data?.pending) toast.warning(message);
      else toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clean-up failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const restoreLawyer = async (lawyer: AdminLawyer) => {
    const confirmed = await confirmDialog({
      title: `Restore ${lawyer.name}?`,
      message:
        "They return at the end of the lawyer list and can sign in again (unless they were blocked before the removal). " +
        "Their cases stay in the Archive until you restore them one by one, and cancelled appointments stay cancelled.",
      confirmLabel: "Restore lawyer",
    });
    if (!confirmed) return;
    setBusy({ id: lawyer._id, action: "restore" });
    try {
      const { message, data } = await restoreAdminLawyer(lawyer._id);
      setRemovedLawyers((prev) => prev.filter((l) => l._id !== lawyer._id));
      setCounts((prev) => ({ current: prev.current + 1, removed: Math.max(0, prev.removed - 1) }));
      if (data) setLawyers((prev) => [...prev.filter((l) => l._id !== data._id), data]);
      toast.success(message || `${lawyer.name} was restored`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore the lawyer");
    } finally {
      setBusy(null);
    }
  };

  const handleSaved = (saved: AdminLawyer, mode: "add" | "edit") => {
    if (mode === "add") {
      setLawyers((prev) => [...prev.filter((l) => l._id !== saved._id), saved]);
      setCounts((prev) => ({ ...prev, current: prev.current + 1 }));
    } else {
      patchLawyer(saved._id, saved);
    }
    setFormMode(null);
  };

  const publicCount = lawyers.filter(isPublic).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">
            Lawyer Management
          </h3>
          <p className="text-sm text-on-surface-variant">
            {canManage
              ? "Add, edit and order lawyer accounts. Lawyers are added by admin only."
              : "Lawyer accounts in their public order."}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setFormMode({ type: "add" })}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Lawyer
          </button>
        )}
      </header>

      {/* Current / Removed tabs */}
      <div role="tablist" aria-label="Lawyer list" className="panel flex w-full gap-1 p-1 sm:w-fit">
        {(["current", "removed"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors sm:flex-none ${
              view === v
                ? "border border-outline-variant bg-surface-raised text-on-surface shadow-sm"
                : "border border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {v === "current" ? "Current" : "Removed"} <span className="tabular-nums opacity-70">{counts[v]}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      {!isLoading && !error && view === "current" && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <StatsCard label="Total Lawyers" value={lawyers.length} />
          <StatsCard label="On Public Site" value={publicCount} />
          <StatsCard label="Unverified" value={lawyers.filter((l) => !l.isVerified).length} />
          <StatsCard label="Blocked" value={lawyers.filter((l) => l.isBlocked).length} />
        </dl>
      )}

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="card h-20 bg-surface-container" />
          ))}
        </div>
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchLawyers()} className="btn btn-secondary btn-sm">
            Try again
          </button>
        </div>
      ) : view === "removed" ? (
        <section className="space-y-3" aria-label="Removed lawyers">
          <p className="notice text-on-surface-variant">
            Removed lawyers cannot sign in and are hidden everywhere, but their account and history are kept.
            Restore brings a lawyer back; their cases stay in the Archive until you restore them.
          </p>
          {removedLawyers.length === 0 ? (
            <div className="card p-10 text-center text-sm text-on-surface-variant">
              No removed lawyers.
            </div>
          ) : (
            <ul className="space-y-2">
              {removedLawyers.map((lawyer) => (
                <RemovedLawyerRow
                  key={lawyer._id}
                  lawyer={lawyer}
                  canManage={canManage}
                  busyAction={busy?.id === lawyer._id ? busy.action : null}
                  onView={() => void openDetails(lawyer._id)}
                  onRestore={() => void restoreLawyer(lawyer)}
                  onFinishRemoval={() => void finishRemoval(lawyer)}
                />
              ))}
            </ul>
          )}
        </section>
      ) : lawyers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant">No lawyers yet. Click &ldquo;Add Lawyer&rdquo; to get started.</p>
        </div>
      ) : (
        <section className="space-y-3" aria-labelledby="lawyer-order-heading">
          <div className="notice notice-info text-on-surface-variant">
            <p>
              <span id="lawyer-order-heading" className="font-semibold text-on-surface">This order is the order on the public site</span>{" "}
              (home page, Our Lawyers and the booking form).{" "}
              {canManage &&
                "Drag a row by its handle, or use the arrow buttons. With a keyboard, focus the handle, press Space, move with the arrow keys and press Space again. "}
              Unverified and blocked lawyers keep their place but are not shown publicly.
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[lockToVerticalAxis]}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable: "To reorder, press Space to pick up this lawyer, use the up and down arrow keys to move, then press Space to drop or Escape to cancel.",
              },
            }}
          >
            <SortableContext items={lawyers.map((l) => l._id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2" aria-busy={isSavingOrder}>
                {lawyers.map((lawyer, index) => (
                  <SortableLawyerRow
                    key={lawyer._id}
                    lawyer={lawyer}
                    position={index + 1}
                    isFirst={index === 0}
                    isLast={index === lawyers.length - 1}
                    reorderDisabled={isSavingOrder || lawyers.length < 2}
                    canManage={canManage}
                    canBlock={canBlock}
                    busyAction={busy?.id === lawyer._id ? busy.action : null}
                    onMove={(offset) => moveLawyer(lawyer._id, offset)}
                    onView={() => void openDetails(lawyer._id)}
                    onEdit={() => setFormMode({ type: "edit", lawyer })}
                    onToggleVerification={() => void toggleVerification(lawyer)}
                    onToggleBlock={() => void toggleBlock(lawyer)}
                    onDelete={() => void deleteLawyer(lawyer)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {/* ── Lawyer Details Modal ─────────────────────────────────── */}
      {(detailsLoading || detailsLawyer || detailsError) && (
        <ModalShell title="Lawyer Details" onClose={closeDetails} maxWidth="max-w-xl">
          <div className="px-5 py-5 sm:px-6">
            {detailsLoading ? (
              <div className="space-y-3" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="panel h-10" />
                ))}
              </div>
            ) : detailsError ? (
              <p className="notice notice-error" role="alert">
                {detailsError}
              </p>
            ) : detailsLawyer ? (
              <div className="space-y-5">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4">
                  <Avatar lawyer={detailsLawyer} size="lg" />
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-on-surface wrap-break-word">{detailsLawyer.name}</p>
                    {detailsLawyer.designation?.en && (
                      <p className="text-sm text-on-surface-variant">{detailsLawyer.designation.en}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <StatusBadges lawyer={detailsLawyer} />
                    </div>
                  </div>
                </div>

                {detailsLawyer.deletedAt ? (
                  <div className="notice notice-error">
                    Removed from the firm on {fmt(detailsLawyer.deletedAt)}.
                    {detailsLawyer.deletionPending && ' The clean-up did not finish; use "Finish clean-up" in the Removed tab.'}
                  </div>
                ) : detailsLawyer.isBlocked && detailsLawyer.blockedReason && (
                  <div className="notice notice-error">
                    Blocked{detailsLawyer.blockedAt ? ` on ${fmt(detailsLawyer.blockedAt)}` : ""}: {detailsLawyer.blockedReason}
                  </div>
                )}

                {/* Contact & Profile Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-on-surface">Contact & Profile</h4>
                  <dl className="divide-y divide-outline-variant border-y border-outline-variant">
                  <DetailRow label="Email" value={detailsLawyer.email} />
                  <DetailRow label="Phone" value={detailsLawyer.phone || "—"} />
                  <DetailRow label="Bar ID" value={detailsLawyer.barId || "—"} />
                  <DetailRow label="Specialization" value={detailsLawyer.specialization || "—"} />
                  <DetailRow label="Consultation fee" value={formatFee(detailsLawyer.consultationFee) || "Not set"} />
                  <DetailRow
                    label="Public order"
                    value={`#${lawyers.findIndex((l) => l._id === detailsLawyer._id) + 1 || "—"}${isPublic(detailsLawyer) ? "" : " (hidden)"}`}
                  />
                  </dl>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-on-surface">Activity Stats</h4>
                  <dl className="panel grid grid-cols-3 divide-x divide-outline-variant">
                    <MiniStat label="Total Cases" value={detailsLawyer.stats.totalCases} />
                    <MiniStat label="Active Cases" value={detailsLawyer.stats.activeCases} />
                    <MiniStat label="Consultations" value={detailsLawyer.stats.totalConsultations} />
                  </dl>
                </div>

                {/* Assistants (managed on the Team page or by the lawyer's My Team) */}
                {detailsLawyer.assistants && detailsLawyer.assistants.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-on-surface">Assistants</h4>
                    <ul className="divide-y divide-outline-variant border-y border-outline-variant">
                      {detailsLawyer.assistants.map((assistant) => (
                        <li key={assistant.staffId} className="py-2 text-sm">
                          {access.isSuperAdmin ? (
                            <Link href={`/dashboard/admin/team/${assistant.staffId}`} className="text-link font-medium">
                              {assistant.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-on-surface">{assistant.name}</span>
                          )}
                          <span className="block text-xs text-on-surface-variant">{summarizePermissions(assistant.permissions)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timestamps */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-on-surface">Account Info</h4>
                  <dl className="divide-y divide-outline-variant border-y border-outline-variant">
                  <DetailRow label="Joined" value={fmt(detailsLawyer.createdAt)} />
                  <DetailRow label="Last Updated" value={fmt(detailsLawyer.updatedAt)} />
                  </dl>
                </div>

                {/* Quick actions from modal (a removed lawyer can only be restored) */}
                {!canManage ? null : detailsLawyer.deletedAt ? (
                  <button
                    type="button"
                    disabled={busy?.id === detailsLawyer._id}
                    onClick={() => {
                      const target = detailsLawyer;
                      closeDetails();
                      void restoreLawyer(target);
                    }}
                    className="btn btn-primary btn-block"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restore lawyer
                  </button>
                ) : (
                <div className="grid grid-cols-2 gap-2 border-t border-outline-variant pt-5 sm:flex sm:flex-row-reverse sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormMode({ type: "edit", lawyer: detailsLawyer })}
                    className="btn btn-primary"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy?.id === detailsLawyer._id}
                    onClick={() => void toggleVerification(detailsLawyer)}
                    className="btn btn-secondary"
                  >
                    {detailsLawyer.isVerified ? <ShieldOff className="h-4 w-4" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    {busy?.id === detailsLawyer._id && busy.action === "verify" ? "Saving…" : detailsLawyer.isVerified ? "Unverify" : "Verify"}
                  </button>
                  {canBlock && (
                    <button
                      type="button"
                      disabled={busy?.id === detailsLawyer._id}
                      onClick={() => void toggleBlock(detailsLawyer)}
                      className="btn btn-secondary"
                    >
                      {detailsLawyer.isBlocked ? <LockOpen className="h-4 w-4" aria-hidden="true" /> : <Ban className="h-4 w-4" aria-hidden="true" />}
                      {busy?.id === detailsLawyer._id && busy.action === "block" ? "Saving…" : detailsLawyer.isBlocked ? "Unblock" : "Block"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy?.id === detailsLawyer._id}
                    onClick={() => void deleteLawyer(detailsLawyer)}
                    className="btn btn-ghost hover:text-error sm:mr-auto"
                  >
                    <UserX className="h-4 w-4" aria-hidden="true" />
                    {busy?.id === detailsLawyer._id && busy.action === "delete" ? "Checking…" : "Remove"}
                  </button>
                </div>
                )}
              </div>
            ) : null}
          </div>
        </ModalShell>
      )}

      {/* ── Add / Edit Lawyer Modal ─────────────────────────────── */}
      {formMode && (
        <LawyerFormModal
          key={formMode.type === "edit" ? formMode.lawyer._id : "add"}
          lawyer={formMode.type === "edit" ? formMode.lawyer : null}
          onClose={() => setFormMode(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableLawyerRowProps {
  lawyer: AdminLawyer;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  reorderDisabled: boolean;
  // Without lawyers.manage the row is read-only (no order controls or actions)
  canManage: boolean;
  canBlock: boolean;
  busyAction: BusyAction | null;
  onMove: (offset: -1 | 1) => void;
  onView: () => void;
  onEdit: () => void;
  onToggleVerification: () => void;
  onToggleBlock: () => void;
  onDelete: () => void;
}

function SortableLawyerRow({
  lawyer, position, isFirst, isLast, reorderDisabled, canManage, canBlock, busyAction,
  onMove, onView, onEdit, onToggleVerification, onToggleBlock, onDelete,
}: SortableLawyerRowProps) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id: lawyer._id, disabled: reorderDisabled || !canManage });

  const isBusy = busyAction !== null;
  const iconAction = "btn btn-ghost btn-icon";
  const spinner = <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`card relative p-3 sm:p-4 ${isDragging ? "z-10 border-secondary shadow-xl ring-2 ring-secondary/40" : ""} ${isPublic(lawyer) ? "" : "bg-surface-container"}`}
    >
      <div className="flex gap-3">
        {/* Order controls */}
        {!canManage ? (
          <span className="w-8 shrink-0 pt-2 text-center text-xs font-semibold tabular-nums text-on-surface-variant">
            #{position}
          </span>
        ) : (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            aria-label={`Move ${lawyer.name} up`}
            title="Move up"
            disabled={isFirst}
            aria-disabled={reorderDisabled || undefined}
            onClick={() => onMove(-1)}
            className="flex h-7 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${lawyer.name}, position ${position}`}
            title="Drag to reorder"
            aria-disabled={reorderDisabled || undefined}
            className="flex h-9 w-8 touch-none cursor-grab items-center justify-center rounded-md border border-outline bg-surface-raised text-on-surface-variant shadow-sm transition-colors hover:border-secondary hover:text-gold-ink active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-secondary aria-disabled:cursor-progress aria-disabled:opacity-60"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-xs font-semibold tabular-nums text-on-surface-variant" aria-hidden>
            #{position}
          </span>
          <button
            type="button"
            aria-label={`Move ${lawyer.name} down`}
            title="Move down"
            disabled={isLast}
            aria-disabled={reorderDisabled || undefined}
            onClick={() => onMove(1)}
            className="flex h-7 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-3">
              <Avatar lawyer={lawyer} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <p className="mr-1 font-semibold text-on-surface wrap-break-word">{lawyer.name}</p>
                  <StatusBadges lawyer={lawyer} compact />
                </div>
                <p className="text-sm text-on-surface-variant break-all">{lawyer.email}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
                  {lawyer.barId && <span>Bar ID: {lawyer.barId}</span>}
                  {lawyer.phone && <span className="tabular-nums">{lawyer.phone}</span>}
                  {lawyer.specialization && <span className="capitalize">{lawyer.specialization}</span>}
                  <span>Added {fmt(lawyer.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-0.5 lg:shrink-0 lg:justify-end">
              <button type="button" title="View details" onClick={onView}
                className="btn btn-secondary btn-sm mr-1.5">
                Details
              </button>
              {canManage && (
              <>
              <button type="button" title="Edit lawyer" onClick={onEdit}
                className={iconAction}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Edit</span>
              </button>
              <button
                type="button"
                title={lawyer.isVerified ? "Remove verification (hides from public site)" : "Verify lawyer"}
                disabled={isBusy}
                onClick={onToggleVerification}
                className={`${iconAction} ${lawyer.isVerified ? "" : "text-gold-ink"}`}
              >
                {busyAction === "verify" ? spinner : lawyer.isVerified ? <ShieldOff className="h-4 w-4" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                <span className="sr-only">{busyAction === "verify" ? "Saving…" : lawyer.isVerified ? "Unverify" : "Verify"}</span>
              </button>
              {canBlock && (
              <button
                type="button"
                title={lawyer.isBlocked ? "Unblock account" : "Block account"}
                disabled={isBusy}
                onClick={onToggleBlock}
                className={iconAction}
              >
                {busyAction === "block" ? spinner : lawyer.isBlocked ? <LockOpen className="h-4 w-4" aria-hidden="true" /> : <Ban className="h-4 w-4" aria-hidden="true" />}
                <span className="sr-only">{busyAction === "block" ? "Saving…" : lawyer.isBlocked ? "Unblock" : "Block"}</span>
              </button>
              )}
              <button
                type="button"
                title="Remove lawyer from the firm"
                aria-label={`Remove ${lawyer.name}`}
                disabled={isBusy}
                onClick={onDelete}
                className={`${iconAction} hover:text-error`}
              >
                {busyAction === "delete" ? spinner : <UserX className="h-4 w-4" aria-hidden="true" />}
                {busyAction === "delete" && <span className="sr-only">Checking…</span>}
              </button>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Removed lawyer row ────────────────────────────────────────────────────────

function RemovedLawyerRow({
  lawyer, canManage, busyAction, onView, onRestore, onFinishRemoval,
}: {
  lawyer: AdminLawyer;
  canManage: boolean;
  busyAction: BusyAction | null;
  onView: () => void;
  onRestore: () => void;
  onFinishRemoval: () => void;
}) {
  return (
    <li className="card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <Avatar lawyer={lawyer} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <p className="mr-1 font-semibold text-on-surface wrap-break-word">{lawyer.name}</p>
              <StatusBadges lawyer={lawyer} compact />
            </div>
            <p className="text-sm text-on-surface-variant break-all">{lawyer.email}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
              {lawyer.barId && <span>Bar ID: {lawyer.barId}</span>}
              <span>Removed {fmt(lawyer.deletedAt ?? undefined)}</span>
            </div>
            {lawyer.deletionPending && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-error">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                The removal did not finish: some cases or appointments may still need archiving or cancelling.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          <button type="button" title="View details" onClick={onView}
            className="btn btn-ghost btn-sm">
            Details
          </button>
          {canManage && lawyer.deletionPending && (
            <button type="button" disabled={busyAction !== null} onClick={onFinishRemoval}
              className="btn btn-secondary btn-sm">
              <Archive className="h-3.5 w-3.5 text-error" aria-hidden="true" />
              {busyAction === "delete" ? "Working…" : "Finish clean-up"}
            </button>
          )}
          {canManage && (
            <button type="button" disabled={busyAction !== null} onClick={onRestore}
              className="btn btn-secondary btn-sm">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {busyAction === "restore" ? "Restoring…" : "Restore"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Removal warning details ───────────────────────────────────────────────────

function DeletionImpactDetails({ impact }: { impact: LawyerDeletionImpact }) {
  const moreCases = impact.openCases - impact.openCaseList.length;
  const moreAppointments = impact.upcomingConsultations - impact.upcomingConsultationList.length;

  return (
    <div className="space-y-3 text-left text-[13px] leading-5 text-on-surface-variant">
      <ImpactItem icon={<Archive className="h-4 w-4" />} tone={impact.openCases ? "warn" : "muted"}>
        {impact.openCases ? (
          <>
            <p className="font-semibold text-on-surface">
              {plural(impact.openCases, "open case")} will move to the Archive.
            </p>
            <ul className="mt-1 space-y-0.5">
              {impact.openCaseList.map((c) => (
                <li key={c._id} className="truncate">
                  <span className="font-medium text-on-surface">{c.caseNumber}</span> · {c.title}{" "}
                  <span className="capitalize">({c.status.replace(/-/g, " ")})</span>
                </li>
              ))}
              {moreCases > 0 && <li>and {moreCases} more</li>}
            </ul>
          </>
        ) : (
          <p>No open cases to archive.</p>
        )}
        {impact.archivedCases > 0 && (
          <p className="mt-1">{plural(impact.archivedCases, "already archived case")} will keep a record of this lawyer.</p>
        )}
      </ImpactItem>

      <ImpactItem icon={<CalendarX className="h-4 w-4" />} tone={impact.upcomingConsultations ? "warn" : "muted"}>
        {impact.upcomingConsultations ? (
          <>
            <p className="font-semibold text-on-surface">
              {plural(impact.upcomingConsultations, "upcoming appointment")} will be cancelled and{" "}
              {plural(impact.affectedClients, "client")} notified (in the app and by email).
            </p>
            <ul className="mt-1 space-y-0.5">
              {impact.upcomingConsultationList.map((c) => (
                <li key={c._id} className="truncate">
                  <span className="font-medium text-on-surface">
                    {new Date(c.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} {c.time}
                  </span>{" "}
                  · {c.clientName} · {c.subject}
                </li>
              ))}
              {moreAppointments > 0 && <li>and {moreAppointments} more</li>}
            </ul>
          </>
        ) : (
          <p>No upcoming appointments to cancel.</p>
        )}
        {impact.pastConsultations > 0 && (
          <p className="mt-1">{plural(impact.pastConsultations, "past appointment")} stay in history under the lawyer&apos;s name.</p>
        )}
      </ImpactItem>

      {Boolean(impact.assistantCount) && (
        <ImpactItem icon={<UsersRound className="h-4 w-4" />} tone="warn">
          <p className="font-semibold text-on-surface">
            {plural(impact.assistantCount ?? 0, "assistant")} will lose access until the lawyer is restored.
          </p>
        </ImpactItem>
      )}

      <ImpactItem icon={<User className="h-4 w-4" />} tone="muted">
        <p>
          The login is disabled and the lawyer is signed out everywhere. The public profile
          {impact.hasProfile ? ", photo" : ""}
          {impact.hasAvailability ? ", weekly availability" : ""} and all history are hidden but kept, so a restore brings them back.
        </p>
      </ImpactItem>

      <p className="panel px-3 py-2">
        To take them off the site temporarily instead, use <strong>Block</strong> or <strong>Unverify</strong>.
      </p>
    </div>
  );
}

function ImpactItem({ icon, tone, children }: { icon: React.ReactNode; tone: "warn" | "muted"; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className={`mt-0.5 shrink-0 ${tone === "warn" ? "text-error" : "text-on-surface-variant"}`}>{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ── Add / edit form ───────────────────────────────────────────────────────────

function LawyerFormModal({
  lawyer, onClose, onSaved,
}: {
  lawyer: AdminLawyer | null;
  onClose: () => void;
  onSaved: (saved: AdminLawyer, mode: "add" | "edit") => void;
}) {
  const isEdit = Boolean(lawyer);
  // Changing a login email is super-admin only (the backend refuses it too)
  const { isSuperAdmin } = useAccess();
  const emailLocked = isEdit && !isSuperAdmin;
  const initial = useMemo<LawyerFormValues>(() => (lawyer ? {
    name: lawyer.name ?? "",
    email: lawyer.email ?? "",
    phone: lawyer.phone ?? "",
    barId: lawyer.barId ?? "",
    specialization: lawyer.specialization ?? "",
    designationEn: lawyer.designation?.en ?? "",
    designationBn: lawyer.designation?.bn ?? "",
    feeBdt: lawyer.consultationFee?.bdt != null ? String(lawyer.consultationFee.bdt) : "",
    feeUsd: lawyer.consultationFee?.usd != null ? String(lawyer.consultationFee.usd) : "",
  } : EMPTY_FORM), [lawyer]);

  const [form, setForm] = useState<LawyerFormValues>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A new photo is uploaded on submit, after the account exists
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const clearPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const source = e.target.files?.[0];
    if (!source) return;
    setPhotoError(null);
    if (!PHOTO_TYPES.includes(source.type)) {
      setPhotoError("Choose a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    setIsPreparingPhoto(true);
    try {
      const { file } = await compressImage(source, { maxWidth: 1000, maxHeight: 1000 });
      if (file.size > PHOTO_MAX_BYTES) {
        setPhotoError("The photo must be 5 MB or smaller.");
        e.target.value = "";
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const set = (key: keyof LawyerFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateLawyerForm(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const trimmed = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim()]),
    ) as unknown as LawyerFormValues;

    setIsSubmitting(true);
    try {
      if (lawyer) {
        // Only send what changed
        const payload: Record<string, unknown> = {};
        for (const key of ["name", "email", "phone", "barId", "specialization"] as const) {
          if (trimmed[key] !== initial[key].trim()) payload[key] = trimmed[key];
        }
        if (trimmed.designationEn !== initial.designationEn.trim() || trimmed.designationBn !== initial.designationBn.trim()) {
          payload.designation = { en: trimmed.designationEn, bn: trimmed.designationBn };
        }
        if (trimmed.feeBdt !== initial.feeBdt.trim() || trimmed.feeUsd !== initial.feeUsd.trim()) {
          payload.consultationFee = { bdt: toFee(trimmed.feeBdt), usd: toFee(trimmed.feeUsd) };
        }
        const hasDetails = Object.keys(payload).length > 0;
        if (!hasDetails && !photo) {
          toast.info("No changes to save");
          onClose();
          return;
        }
        let saved = lawyer;
        let message = "";
        if (hasDetails) {
          const updated = await updateAdminLawyer(lawyer._id, payload);
          saved = updated.data;
          message = updated.message;
        }
        if (photo) {
          try {
            const uploaded = await uploadAdminLawyerPhoto(lawyer._id, photo);
            saved = uploaded.data;
            message = hasDetails ? `${saved.name}'s details and photo were updated` : uploaded.message;
          } catch (err) {
            // Nothing was saved: let the outer handler show it in the form
            if (!hasDetails) throw err;
            toast.error(err instanceof Error ? `Details saved, but the photo was not uploaded: ${err.message}` : "Photo was not uploaded");
            onSaved(saved, "edit");
            return;
          }
        }
        toast.success(message || "Lawyer updated");
        onSaved(saved, "edit");
      } else {
        const { message, data, emailSent } = await addAdminLawyer({
          name: trimmed.name, email: trimmed.email, phone: trimmed.phone,
          barId: trimmed.barId, specialization: trimmed.specialization,
        });
        let saved = data;
        // Designation and fee live on the public profile, saved once the account exists
        const profileFields: Record<string, unknown> = {};
        if (trimmed.designationEn || trimmed.designationBn) {
          profileFields.designation = { en: trimmed.designationEn, bn: trimmed.designationBn };
        }
        if (trimmed.feeBdt || trimmed.feeUsd) {
          profileFields.consultationFee = { bdt: toFee(trimmed.feeBdt), usd: toFee(trimmed.feeUsd) };
        }
        if (Object.keys(profileFields).length) {
          try {
            saved = (await updateAdminLawyer(data._id, profileFields)).data;
          } catch (err) {
            toast.error(err instanceof Error ? `Lawyer created, but the designation and fee were not saved: ${err.message}` : "Designation and fee were not saved");
          }
        }
        if (photo) {
          try {
            saved = (await uploadAdminLawyerPhoto(data._id, photo)).data;
          } catch (err) {
            toast.error(err instanceof Error ? `Lawyer created, but the photo was not uploaded: ${err.message}` : "Photo was not uploaded");
          }
        }
        if (emailSent) toast.success(message);
        else toast.warning(message);
        onSaved(saved, "add");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : isEdit ? "Failed to update lawyer" : "Failed to add lawyer";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (key: keyof LawyerFormValues) => `field ${errors[key] ? "field-invalid" : ""}`;

  const field = (
    key: keyof LawyerFormValues,
    label: string,
    opts: { type?: string; placeholder?: string; required?: boolean; wide?: boolean; lang?: string; autoComplete?: string; disabled?: boolean; hint?: string; inputMode?: "decimal" } = {},
  ) => (
    <label className={`block ${opts.wide ? "sm:col-span-2" : ""}`}>
      <span className="label">{label} {opts.required && <span className="text-error">*</span>}</span>
      <input
        type={opts.type ?? "text"}
        value={form[key]}
        onChange={set(key)}
        lang={opts.lang}
        inputMode={opts.inputMode}
        autoComplete={opts.autoComplete ?? "off"}
        aria-invalid={Boolean(errors[key])}
        className={fieldClass(key)}
        placeholder={opts.placeholder}
        disabled={opts.disabled}
      />
      {opts.hint && <span className="mt-1 block text-xs text-on-surface-variant">{opts.hint}</span>}
      {errors[key] && <span className="error-text block">{errors[key]}</span>}
    </label>
  );

  return (
    <ModalShell
      title={isEdit ? `Edit ${lawyer?.name}` : "Add New Lawyer"}
      onClose={() => { if (!isSubmitting) onClose(); }}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="notice notice-info text-on-surface-variant">
          {isEdit ? (
            <>Changes show on the public profile right away. If you change the email, the lawyer signs in with the new address from now on.</>
          ) : (
            <>The lawyer will get an email with a link to set their own password (valid 72 hours). If it expires they can use &ldquo;Forgot Password&rdquo; on the login page. New lawyers appear last in the public order.</>
          )}
        </div>

        {formError && (
          <p role="alert" className="notice notice-error">{formError}</p>
        )}

        {/* Profile photo */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-raised">
            {photoPreview || lawyer?.profileImageUrl ? (
              <Image
                src={photoPreview ?? lawyer!.profileImageUrl!}
                alt={photoPreview ? "New photo preview" : `${lawyer?.name ?? "Lawyer"}'s photo`}
                fill
                sizes="80px"
                unoptimized={Boolean(photoPreview)}
                className="object-cover"
              />
            ) : (
              <div aria-hidden="true" className="monogram h-full w-full rounded-none border-0 text-2xl">
                {form.name.trim().charAt(0).toUpperCase() || <User className="h-7 w-7" />}
              </div>
            )}
            {isPreparingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-1.5">
            <span className="label mb-0">Profile Photo</span>
            <div className="flex flex-wrap gap-2">
              <label className={`btn btn-secondary btn-sm cursor-pointer ${isSubmitting || isPreparingPhoto ? "pointer-events-none opacity-60" : ""}`}>
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                {photoPreview || lawyer?.profileImageUrl ? "Change Photo" : "Upload Photo"}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => void handlePhotoChange(e)}
                  disabled={isSubmitting || isPreparingPhoto}
                />
              </label>
              {photo && (
                <button type="button" onClick={clearPhoto} disabled={isSubmitting} className="btn btn-ghost btn-sm">
                  {lawyer?.profileImageUrl ? "Keep current" : "Remove"}
                </button>
              )}
            </div>
            <span className="block text-xs text-on-surface-variant">
              {photo ? "Uploaded when you save. " : ""}JPG, PNG or WebP, up to 5 MB. Shown cropped to a square.
            </span>
            {photoError && <span role="alert" className="error-text block">{photoError}</span>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Full Name", { required: true, wide: true, placeholder: "Lawyer's full name" })}
          {field("email", "Email Address", {
            type: "email", required: true, wide: true, placeholder: "lawyer@islamassociates.com",
            disabled: emailLocked, hint: emailLocked ? "Only the super-admin can change a login email." : undefined,
          })}
          {field("phone", "Phone Number", { type: "tel", required: true, placeholder: "+8801XXXXXXXXX" })}
          {field("barId", "Bar ID", { required: true, placeholder: "BC-XXXX" })}
          {field("specialization", "Specialization", { wide: true, placeholder: "e.g. Immigration & Corporate Law" })}
          {field("designationEn", "Designation (English)", { placeholder: "e.g. Senior Advocate" })}
          {field("designationBn", "Designation (বাংলা)", { lang: "bn", placeholder: "যেমন: সিনিয়র অ্যাডভোকেট" })}
          {field("feeBdt", "Consultation Fee (৳ BDT)", { inputMode: "decimal", placeholder: "e.g. 5000" })}
          {field("feeUsd", "Consultation Fee ($ USD)", { inputMode: "decimal", placeholder: "e.g. 50" })}
          <p className="-mt-2 text-xs text-on-surface-variant sm:col-span-2">
            Shown on the lawyer&apos;s card, profile and the booking button. Leave blank to hide. The lawyer can also change it from their profile.
          </p>
        </div>

        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-outline-variant px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || isPreparingPhoto}
            className="btn btn-primary">
            {isSubmitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save Changes" : "Create Lawyer Account"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function ModalShell({
  title, onClose, maxWidth, children,
}: {
  title: string;
  onClose: () => void;
  maxWidth: string;
  children: React.ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Leave Escape to the confirm dialog, or to another modal opened on top of this one
      if (document.querySelector('[role="alertdialog"]')) return;
      const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (modals[modals.length - 1] === dialogRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(10_22_40/0.55)] p-4 pt-12 sm:pt-16"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${maxWidth} shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <h3 className="min-w-0 truncate font-display text-lg font-semibold text-on-surface">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn btn-ghost btn-icon -mr-2 shrink-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Avatar({ lawyer, size }: { lawyer: AdminLawyer; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 border-2" : "h-10 w-10 border";
  if (lawyer.profileImageUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full border-outline-variant ${box}`}>
        <Image src={lawyer.profileImageUrl} alt={lawyer.name} fill sizes={size === "lg" ? "64px" : "40px"} className="object-cover" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`monogram ${size === "lg" ? "h-16 w-16 text-2xl" : "h-10 w-10 text-sm"}`}>
      {lawyer.name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadges({ lawyer, compact = false }: { lawyer: AdminLawyer; compact?: boolean }) {
  if (lawyer.deletedAt) {
    return (
      <span className="chip">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-error" />
        {lawyer.deletionPending ? "Removal unfinished" : "Removed"}
      </span>
    );
  }
  return (
    <>
      <span className="chip">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${lawyer.isVerified ? "bg-success" : "bg-secondary"}`} />
        {lawyer.isVerified ? "Verified" : compact ? "Pending" : "Pending Verification"}
      </span>
      {lawyer.isBlocked && (
        <span className="chip"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-error" />Blocked</span>
      )}
      {!isPublic(lawyer) && (
        <span className="chip">
          Hidden from site
        </span>
      )}
      {lawyer.passwordNeedsChange && (
        <span className="chip">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-secondary" />
          Password Change Required
        </span>
      )}
    </>
  );
}

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-semibold text-on-surface tabular-nums">{value}</dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-2.5 text-sm">
      <dt className="w-32 shrink-0 text-on-surface-variant">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-on-surface">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse px-2 py-3 text-center">
      <dt className="mt-0.5 text-xs text-on-surface-variant sm:text-sm">{label}</dt>
      <dd className="font-display text-xl font-bold text-on-surface tabular-nums">{value}</dd>
    </div>
  );
}
