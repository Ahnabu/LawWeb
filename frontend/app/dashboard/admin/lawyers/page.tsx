"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus, X, Scale, ShieldCheck, ShieldOff, Trash2, Eye, Pencil,
  Mail, Phone, BadgeCheck, Calendar, User, Briefcase,
  FileText, Clock, CheckCircle, GripVertical, ChevronUp, ChevronDown,
  Ban, LockOpen, Info, Archive, CalendarX, Globe,
} from "lucide-react";
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
import {
  addAdminLawyer, blockAdminUser, deleteAdminLawyer, getAdminLawyerDetails, getAdminLawyers,
  getLawyerDeletionImpact, reorderAdminLawyers, toggleLawyerVerification, unblockAdminUser, updateAdminLawyer,
  type AdminLawyer, type AdminLawyerDetails, type LawyerDeletionImpact,
} from "../../../../lib/dashboard";

interface LawyerFormValues {
  name: string;
  email: string;
  phone: string;
  barId: string;
  specialization: string;
  designationEn: string;
  designationBn: string;
}

type FormErrors = Partial<Record<keyof LawyerFormValues, string>>;

const EMPTY_FORM: LawyerFormValues = {
  name: "", email: "", phone: "", barId: "", specialization: "", designationEn: "", designationBn: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  return errors;
}

const isPublic = (l: AdminLawyer) => l.isVerified && !l.isBlocked;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Rows only move up and down
const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export default function AdminLawyersPage() {
  const [lawyers, setLawyers] = useState<AdminLawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: "verify" | "block" | "delete" } | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Add / edit modal
  const [formMode, setFormMode] = useState<{ type: "add" } | { type: "edit"; lawyer: AdminLawyer } | null>(null);

  // Details modal
  const [detailsLawyer, setDetailsLawyer] = useState<AdminLawyerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const fetchLawyers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setLawyers(await getAdminLawyers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lawyers");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        title: `Delete ${lawyer.name}?`,
        message: "This permanently deletes the lawyer's account and cannot be undone. Here is what will happen:",
        confirmLabel: "Delete lawyer",
        tone: "danger",
        details: <DeletionImpactDetails impact={impact} />,
        confirmPhrase: lawyer.email,
      });
      if (!confirmed) return;

      const { message } = await deleteAdminLawyer(lawyer._id);
      setLawyers((prev) => prev.filter((l) => l._id !== lawyer._id));
      setDetailsLawyer((prev) => (prev?._id === lawyer._id ? null : prev));
      toast.success(message || `${lawyer.name} was removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSaved = (saved: AdminLawyer, mode: "add" | "edit") => {
    if (mode === "add") {
      setLawyers((prev) => [...prev.filter((l) => l._id !== saved._id), saved]);
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
            Add, edit and order lawyer accounts. Lawyers are added by admin only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormMode({ type: "add" })}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" />
          Add Lawyer
        </button>
      </header>

      {/* Stats */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatsCard label="Total Lawyers" value={lawyers.length} />
          <StatsCard label="On Public Site" value={publicCount} />
          <StatsCard label="Unverified" value={lawyers.filter((l) => !l.isVerified).length} />
          <StatsCard label="Blocked" value={lawyers.filter((l) => l.isBlocked).length} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-20 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchLawyers()} className="rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold hover:bg-error/10 transition">
            Try again
          </button>
        </div>
      ) : lawyers.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-8 text-center">
          <Scale className="mx-auto mb-3 h-8 w-8 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">No lawyers yet. Click &ldquo;Add Lawyer&rdquo; to get started.</p>
        </div>
      ) : (
        <section className="space-y-3" aria-labelledby="lawyer-order-heading">
          <div className="flex items-start gap-2.5 rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2.5 text-xs leading-5 text-on-surface-variant">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <p>
              <span id="lawyer-order-heading" className="font-semibold text-on-surface">This order is the order on the public site</span>{" "}
              (home page, Our Lawyers and the booking form). Drag a row by its handle, or use the arrow buttons.
              With a keyboard, focus the handle, press Space, move with the arrow keys and press Space again.
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
              <ol className="space-y-3" aria-busy={isSavingOrder}>
                {lawyers.map((lawyer, index) => (
                  <SortableLawyerRow
                    key={lawyer._id}
                    lawyer={lawyer}
                    position={index + 1}
                    isFirst={index === 0}
                    isLast={index === lawyers.length - 1}
                    reorderDisabled={isSavingOrder || lawyers.length < 2}
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
        <ModalShell title="Lawyer Details" icon={<User className="h-5 w-5 text-primary" />} onClose={closeDetails} maxWidth="max-w-xl">
          <div className="p-5">
            {detailsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-container" />
                ))}
              </div>
            ) : detailsError ? (
              <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {detailsError}
              </div>
            ) : detailsLawyer ? (
              <div className="space-y-5">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4">
                  <Avatar lawyer={detailsLawyer} size="lg" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-on-surface wrap-break-word">{detailsLawyer.name}</p>
                    {detailsLawyer.designation?.en && (
                      <p className="text-xs text-on-surface-variant">{detailsLawyer.designation.en}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2">
                      <StatusBadges lawyer={detailsLawyer} />
                    </div>
                  </div>
                </div>

                {detailsLawyer.isBlocked && detailsLawyer.blockedReason && (
                  <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
                    Blocked{detailsLawyer.blockedAt ? ` on ${fmt(detailsLawyer.blockedAt)}` : ""}: {detailsLawyer.blockedReason}
                  </div>
                )}

                {/* Contact & Profile Info */}
                <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Contact & Profile</p>
                  <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={detailsLawyer.email} />
                  <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={detailsLawyer.phone || "—"} />
                  <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Bar ID" value={detailsLawyer.barId || "—"} />
                  <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Specialization" value={detailsLawyer.specialization || "—"} />
                  <DetailRow
                    icon={<Globe className="h-4 w-4" />}
                    label="Public order"
                    value={`#${lawyers.findIndex((l) => l._id === detailsLawyer._id) + 1 || "—"}${isPublic(detailsLawyer) ? "" : " (hidden)"}`}
                  />
                </div>

                {/* Stats */}
                <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Activity Stats</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <MiniStat icon={<FileText className="h-4 w-4" />} label="Total Cases" value={detailsLawyer.stats.totalCases} />
                    <MiniStat icon={<CheckCircle className="h-4 w-4" />} label="Active Cases" value={detailsLawyer.stats.activeCases} />
                    <MiniStat icon={<Clock className="h-4 w-4" />} label="Consultations" value={detailsLawyer.stats.totalConsultations} />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Account Info</p>
                  <DetailRow icon={<Calendar className="h-4 w-4" />} label="Joined" value={fmt(detailsLawyer.createdAt)} />
                  <DetailRow icon={<Calendar className="h-4 w-4" />} label="Last Updated" value={fmt(detailsLawyer.updatedAt)} />
                </div>

                {/* Quick actions from modal */}
                <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setFormMode({ type: "edit", lawyer: detailsLawyer })}
                    className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition sm:flex-1"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy?.id === detailsLawyer._id}
                    onClick={() => void toggleVerification(detailsLawyer)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 sm:flex-1 ${detailsLawyer.isVerified ? "border-error/40 text-error hover:bg-error/10" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-on-primary"}`}
                  >
                    {detailsLawyer.isVerified ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    {busy?.id === detailsLawyer._id && busy.action === "verify" ? "Saving…" : detailsLawyer.isVerified ? "Unverify" : "Verify"}
                  </button>
                  <button
                    type="button"
                    disabled={busy?.id === detailsLawyer._id}
                    onClick={() => void toggleBlock(detailsLawyer)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50"
                  >
                    {detailsLawyer.isBlocked ? <LockOpen className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    {busy?.id === detailsLawyer._id && busy.action === "block" ? "Saving…" : detailsLawyer.isBlocked ? "Unblock" : "Block"}
                  </button>
                  <button
                    type="button"
                    disabled={busy?.id === detailsLawyer._id}
                    onClick={() => void deleteLawyer(detailsLawyer)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-error/40 px-4 py-2 text-sm font-semibold text-error hover:bg-error/10 transition disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {busy?.id === detailsLawyer._id && busy.action === "delete" ? "Checking…" : "Delete"}
                  </button>
                </div>
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
  busyAction: "verify" | "block" | "delete" | null;
  onMove: (offset: -1 | 1) => void;
  onView: () => void;
  onEdit: () => void;
  onToggleVerification: () => void;
  onToggleBlock: () => void;
  onDelete: () => void;
}

function SortableLawyerRow({
  lawyer, position, isFirst, isLast, reorderDisabled, busyAction,
  onMove, onView, onEdit, onToggleVerification, onToggleBlock, onDelete,
}: SortableLawyerRowProps) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id: lawyer._id, disabled: reorderDisabled });

  const isBusy = busyAction !== null;
  const actionBase = "flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative rounded-xl border bg-surface-container p-3 sm:p-4 ${isDragging ? "z-10 border-secondary shadow-xl ring-2 ring-secondary/40" : "border-outline-variant"} ${isPublic(lawyer) ? "" : "opacity-90"}`}
    >
      <div className="flex gap-3">
        {/* Order controls */}
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            aria-label={`Move ${lawyer.name} up`}
            title="Move up"
            disabled={isFirst}
            aria-disabled={reorderDisabled || undefined}
            onClick={() => onMove(-1)}
            className="rounded p-1 text-on-surface-variant hover:bg-surface hover:text-on-surface transition disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${lawyer.name}, position ${position}`}
            title="Drag to reorder"
            aria-disabled={reorderDisabled || undefined}
            className="flex h-9 w-8 touch-none cursor-grab items-center justify-center rounded-md border border-outline-variant bg-surface text-on-surface-variant hover:border-secondary hover:text-secondary active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-secondary aria-disabled:cursor-progress aria-disabled:opacity-60"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-semibold tabular-nums text-on-surface-variant" aria-hidden>
            #{position}
          </span>
          <button
            type="button"
            aria-label={`Move ${lawyer.name} down`}
            title="Move down"
            disabled={isLast}
            aria-disabled={reorderDisabled || undefined}
            onClick={() => onMove(1)}
            className="rounded p-1 text-on-surface-variant hover:bg-surface hover:text-on-surface transition disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-3">
              <Avatar lawyer={lawyer} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-on-surface wrap-break-word">{lawyer.name}</p>
                  <StatusBadges lawyer={lawyer} compact />
                </div>
                <p className="text-sm text-on-surface-variant break-all">{lawyer.email}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
                  {lawyer.barId && <span>Bar ID: {lawyer.barId}</span>}
                  {lawyer.phone && <span>{lawyer.phone}</span>}
                  {lawyer.specialization && <span className="capitalize">{lawyer.specialization}</span>}
                  <span>Added {fmt(lawyer.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
              <button type="button" title="View details" onClick={onView}
                className={`${actionBase} border-secondary/60 bg-secondary/10 text-secondary hover:bg-secondary hover:text-primary`}>
                <Eye className="h-3.5 w-3.5" />
                Details
              </button>
              <button type="button" title="Edit lawyer" onClick={onEdit}
                className={`${actionBase} border-outline-variant text-on-surface hover:bg-surface`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                title={lawyer.isVerified ? "Remove verification (hides from public site)" : "Verify lawyer"}
                disabled={isBusy}
                onClick={onToggleVerification}
                className={`${actionBase} ${lawyer.isVerified ? "border-error/40 text-error hover:bg-error/10" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-on-primary"}`}
              >
                {lawyer.isVerified ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {busyAction === "verify" ? "Saving…" : lawyer.isVerified ? "Unverify" : "Verify"}
              </button>
              <button
                type="button"
                title={lawyer.isBlocked ? "Unblock account" : "Block account"}
                disabled={isBusy}
                onClick={onToggleBlock}
                className={`${actionBase} border-outline-variant text-on-surface-variant hover:bg-surface`}
              >
                {lawyer.isBlocked ? <LockOpen className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                {busyAction === "block" ? "Saving…" : lawyer.isBlocked ? "Unblock" : "Block"}
              </button>
              <button
                type="button"
                title="Delete lawyer"
                aria-label={`Delete ${lawyer.name}`}
                disabled={isBusy}
                onClick={onDelete}
                className={`${actionBase} border-outline-variant text-on-surface-variant hover:border-error/40 hover:bg-error/10 hover:text-error`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sm:hidden">{busyAction === "delete" ? "Checking…" : "Delete"}</span>
                {busyAction === "delete" && <span className="hidden sm:inline">Checking…</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Deletion warning details ──────────────────────────────────────────────────

function DeletionImpactDetails({ impact }: { impact: LawyerDeletionImpact }) {
  const moreCases = impact.openCases - impact.openCaseList.length;
  const moreAppointments = impact.upcomingConsultations - impact.upcomingConsultationList.length;

  return (
    <div className="space-y-3 text-left text-xs leading-5 text-on-surface-variant">
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

      <ImpactItem icon={<User className="h-4 w-4" />} tone="muted">
        <p>
          The public profile{impact.hasProfile ? " and photo" : ""}
          {impact.hasAvailability ? ", weekly availability" : ""} and login are removed, and the lawyer is signed out everywhere.
        </p>
      </ImpactItem>

      <p className="rounded-md bg-surface-container px-2.5 py-2">
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
  const initial = useMemo<LawyerFormValues>(() => (lawyer ? {
    name: lawyer.name ?? "",
    email: lawyer.email ?? "",
    phone: lawyer.phone ?? "",
    barId: lawyer.barId ?? "",
    specialization: lawyer.specialization ?? "",
    designationEn: lawyer.designation?.en ?? "",
    designationBn: lawyer.designation?.bn ?? "",
  } : EMPTY_FORM), [lawyer]);

  const [form, setForm] = useState<LawyerFormValues>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (Object.keys(payload).length === 0) {
          toast.info("No changes to save");
          onClose();
          return;
        }
        const { message, data } = await updateAdminLawyer(lawyer._id, payload);
        toast.success(message || "Lawyer updated");
        onSaved(data, "edit");
      } else {
        const { message, data, emailSent } = await addAdminLawyer({
          name: trimmed.name, email: trimmed.email, phone: trimmed.phone,
          barId: trimmed.barId, specialization: trimmed.specialization,
        });
        let saved = data;
        if (trimmed.designationEn || trimmed.designationBn) {
          try {
            saved = (await updateAdminLawyer(data._id, { designation: { en: trimmed.designationEn, bn: trimmed.designationBn } })).data;
          } catch (err) {
            toast.error(err instanceof Error ? `Lawyer created, but the designation was not saved: ${err.message}` : "Designation was not saved");
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

  const fieldClass = (key: keyof LawyerFormValues) =>
    `mt-1 block w-full rounded-lg border bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary ${errors[key] ? "border-error" : "border-outline"}`;

  const field = (
    key: keyof LawyerFormValues,
    label: string,
    opts: { type?: string; placeholder?: string; required?: boolean; wide?: boolean; lang?: string; autoComplete?: string } = {},
  ) => (
    <label className={`block text-xs font-medium text-on-surface-variant ${opts.wide ? "sm:col-span-2" : ""}`}>
      {label} {opts.required && <span className="text-error">*</span>}
      <input
        type={opts.type ?? "text"}
        value={form[key]}
        onChange={set(key)}
        lang={opts.lang}
        autoComplete={opts.autoComplete ?? "off"}
        aria-invalid={Boolean(errors[key])}
        className={fieldClass(key)}
        placeholder={opts.placeholder}
      />
      {errors[key] && <span className="mt-1 block text-[11px] text-error">{errors[key]}</span>}
    </label>
  );

  return (
    <ModalShell
      title={isEdit ? `Edit ${lawyer?.name}` : "Add New Lawyer"}
      icon={isEdit ? <Pencil className="h-5 w-5 text-secondary" /> : <Scale className="h-5 w-5 text-secondary" />}
      onClose={() => { if (!isSubmitting) onClose(); }}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2 text-xs text-on-surface-variant">
          {isEdit ? (
            <>Changes show on the public profile right away. If you change the email, the lawyer signs in with the new address from now on.</>
          ) : (
            <>The lawyer will get an email with a link to set their own password (valid 72 hours). If it expires they can use &ldquo;Forgot Password&rdquo; on the login page. New lawyers appear last in the public order.</>
          )}
        </div>

        {formError && (
          <div role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{formError}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Full Name", { required: true, wide: true, placeholder: "Lawyer's full name" })}
          {field("email", "Email Address", { type: "email", required: true, wide: true, placeholder: "lawyer@islamassociates.com" })}
          {field("phone", "Phone Number", { type: "tel", required: true, placeholder: "+8801XXXXXXXXX" })}
          {field("barId", "Bar ID", { required: true, placeholder: "BC-XXXX" })}
          {field("specialization", "Specialization", { wide: true, placeholder: "e.g. Immigration & Corporate Law" })}
          {field("designationEn", "Designation (English)", { placeholder: "e.g. Senior Advocate" })}
          {field("designationBn", "Designation (বাংলা)", { lang: "bn", placeholder: "যেমন: সিনিয়র অ্যাডভোকেট" })}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-primary hover:opacity-90 transition disabled:opacity-50">
            {isSubmitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save Changes" : "Create Lawyer Account"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function ModalShell({
  title, icon, onClose, maxWidth, children,
}: {
  title: string;
  icon: React.ReactNode;
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12 sm:pt-16"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={`w-full ${maxWidth} rounded-2xl border border-outline-variant bg-surface shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant p-5">
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <h3 className="truncate font-display text-lg font-semibold text-on-surface">{title}</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container transition"
          >
            <X className="h-5 w-5" />
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
      <div className={`relative shrink-0 overflow-hidden rounded-full border-primary/30 ${box}`}>
        <Image src={lawyer.profileImageUrl} alt={lawyer.name} fill sizes={size === "lg" ? "64px" : "40px"} className="object-cover" />
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full border-primary/20 bg-primary/10 ${box}`}>
      <span className={`font-bold text-primary ${size === "lg" ? "text-2xl" : "text-sm"}`}>
        {lawyer.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function StatusBadges({ lawyer, compact = false }: { lawyer: AdminLawyer; compact?: boolean }) {
  return (
    <>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lawyer.isVerified ? "bg-green-500/10 text-green-700" : "bg-secondary/10 text-secondary"}`}>
        {lawyer.isVerified ? "Verified" : compact ? "Pending" : "Pending Verification"}
      </span>
      {lawyer.isBlocked && (
        <span className="rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-semibold text-error">Blocked</span>
      )}
      {!isPublic(lawyer) && (
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant ring-1 ring-outline-variant">
          Hidden from site
        </span>
      )}
      {lawyer.passwordNeedsChange && (
        <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
          Password Change Required
        </span>
      )}
    </>
  );
}

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-3 sm:p-4">
      <p className="text-xs text-on-surface-variant sm:text-sm">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface sm:mt-2 sm:text-3xl">{value}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-on-surface-variant shrink-0">{icon}</span>
      <span className="text-xs text-on-surface-variant w-24 shrink-0">{label}</span>
      <span className="text-sm text-on-surface font-medium truncate">{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface p-2 text-center border border-outline-variant/50 sm:p-3">
      <div className="flex justify-center text-secondary mb-1">{icon}</div>
      <p className="text-xl font-bold text-on-surface">{value}</p>
      <p className="text-[11px] text-on-surface-variant mt-0.5 sm:text-xs">{label}</p>
    </div>
  );
}
