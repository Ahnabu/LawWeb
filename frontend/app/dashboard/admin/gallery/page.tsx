"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, ChevronUp, ExternalLink, Eye, EyeOff, GripVertical, ImageOff, ImagePlus, Loader2, Pencil, Trash2, UploadCloud, X,
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
import { RichTextEditor } from "../../../../components/RichTextEditor";
import { richTextToPlain } from "../../../../lib/richText";
import { compressImage } from "../../../../lib/imageCompression";
import {
  GALLERY_DESCRIPTION_MAX, GALLERY_TITLE_MAX,
  deleteGalleryImage, galleryThumbUrl, listAdminGallery, reorderGallery, updateGalleryImage, uploadGalleryImage,
  type AdminGalleryImage, type AdminGalleryMeta,
} from "../../../../lib/gallery";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // backend upload limit, checked after compression
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // larger originals are fine: they're compressed first
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const titleOf = (image: AdminGalleryImage) => image.title?.en?.trim() || image.title?.bn?.trim() || "Untitled photo";
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Rows only move up and down
const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type BusyAction = "visibility" | "delete";

export default function AdminGalleryPage() {
  const [images, setImages] = useState<AdminGalleryImage[]>([]);
  const [meta, setMeta] = useState<AdminGalleryMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: BusyAction } | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryImage | null>(null);

  // Upload
  const [publishOnUpload, setPublishOnUpload] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; stage: "compressing" | "uploading" } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchGallery = useCallback(async (options: { quiet?: boolean } = {}) => {
    if (!options.quiet) setIsLoading(true);
    setError(null);
    try {
      const { images: rows, meta: nextMeta } = await listAdminGallery();
      setImages(rows);
      setMeta(nextMeta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the gallery");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchGallery(); }, [fetchGallery]);

  const counts = useMemo(() => {
    const published = images.filter((i) => i.isPublished).length;
    return { total: images.length, published, hidden: images.length - published };
  }, [images]);
  const maxImages = meta?.max ?? 300;

  const patchImage = (id: string, patch: Partial<AdminGalleryImage>) =>
    setImages((prev) => prev.map((i) => (i._id === id ? { ...i, ...patch } : i)));

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadFiles = async (list: FileList | File[]) => {
    if (uploadProgress) return;
    const files = Array.from(list);
    const accepted = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (accepted.length < files.length) {
      toast.error(`${files.length - accepted.length} file(s) skipped: only JPG, PNG and WebP images can be added.`);
    }
    const room = Math.max(0, maxImages - images.length);
    if (accepted.length > room) {
      toast.error(room === 0
        ? `The gallery holds at most ${maxImages} photos. Delete some before adding more.`
        : `Only ${room} more photo(s) fit in the gallery; the rest were skipped.`);
    }
    const queue = accepted.slice(0, room);
    if (queue.length === 0) return;

    let added = 0;
    const failed: string[] = [];
    for (const [index, source] of queue.entries()) {
      try {
        if (source.size > MAX_SOURCE_BYTES) throw new Error("larger than 25 MB");
        setUploadProgress({ done: index, total: queue.length, stage: "compressing" });
        const { file } = await compressImage(source, { maxWidth: 2000, maxHeight: 2000 });
        if (file.size > MAX_IMAGE_BYTES) throw new Error("still over 8 MB after compression");
        setUploadProgress({ done: index, total: queue.length, stage: "uploading" });
        const { data } = await uploadGalleryImage(file, publishOnUpload);
        // New photos go to the top, as on the server
        setImages((prev) => [data, ...prev]);
        added++;
      } catch (err) {
        failed.push(`${source.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
    }
    setUploadProgress(null);

    if (added > 0) {
      toast.success(
        `${added} photo${added === 1 ? "" : "s"} added${publishOnUpload ? " and shown on the gallery page" : " (hidden until you show them)"}. Add a title with Edit.`,
      );
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} photo${failed.length === 1 ? "" : "s"} not added`, { description: failed.slice(0, 3).join("\n") });
    }
    void fetchGallery({ quiet: true });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  };

  // ── Ordering ──────────────────────────────────────────────────────────────
  const saveOrder = async (next: AdminGalleryImage[], previous: AdminGalleryImage[]) => {
    setImages(next);
    setIsSavingOrder(true);
    try {
      const { message, data } = await reorderGallery(next.map((i) => i._id));
      const positions = new Map(data.map((d) => [d._id, d.sortOrder]));
      setImages((current) => current.map((i) => ({ ...i, sortOrder: positions.get(i._id) ?? i.sortOrder })));
      // Same id: rapid moves update one toast instead of stacking several
      toast.success(message || "Gallery order saved", { id: "gallery-order" });
    } catch (err) {
      setImages(previous);
      toast.error(err instanceof Error ? `${err.message} The previous order was restored.` : "Could not save the order.", {
        id: "gallery-order",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const moveImage = (id: string, offset: -1 | 1) => {
    const from = images.findIndex((i) => i._id === id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= images.length || isSavingOrder) return;
    void saveOrder(arrayMove(images, from, to), images);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = images.findIndex((i) => i._id === active.id);
    const to = images.findIndex((i) => i._id === over.id);
    if (from < 0 || to < 0) return;
    void saveOrder(arrayMove(images, from, to), images);
  };

  const nameOf = useCallback((id: string | number) => {
    const image = images.find((i) => i._id === id);
    return image ? titleOf(image) : "Photo";
  }, [images]);
  const positionOf = useCallback((id: string | number) => images.findIndex((i) => i._id === id) + 1, [images]);

  const announcements = useMemo<Announcements>(() => ({
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, position ${positionOf(active.id)} of ${images.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} moved to position ${positionOf(over.id)} of ${images.length}.` : `${nameOf(active.id)} is not over a position.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at position ${positionOf(over.id)}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  }), [nameOf, positionOf, images.length]);

  // ── Row actions ───────────────────────────────────────────────────────────
  const toggleVisibility = async (image: AdminGalleryImage) => {
    setBusy({ id: image._id, action: "visibility" });
    try {
      const { message, data } = await updateGalleryImage(image._id, { isPublished: !image.isPublished });
      patchImage(image._id, { isPublished: data.isPublished });
      toast.success(message || (data.isPublished ? "Photo shown" : "Photo hidden"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update the photo");
    } finally {
      setBusy(null);
    }
  };

  const removeImage = async (image: AdminGalleryImage) => {
    const confirmed = await confirmDialog({
      title: `Delete "${titleOf(image)}"?`,
      message: "The photo is removed from the gallery page and deleted from storage. This cannot be undone. To take it off the site for now, hide it instead.",
      confirmLabel: "Delete photo",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusy({ id: image._id, action: "delete" });
    try {
      const { message } = await deleteGalleryImage(image._id);
      setImages((prev) => prev.filter((i) => i._id !== image._id));
      toast.success(message || "Photo deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the photo");
    } finally {
      setBusy(null);
    }
  };

  const isUploading = uploadProgress !== null;
  const isFull = images.length >= maxImages;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Photo Gallery</h3>
          <p className="text-sm text-on-surface-variant">Photos on the public Gallery page, with their titles and descriptions.</p>
        </div>
        <Link href="/gallery" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View gallery page
        </Link>
      </header>

      {!isLoading && !error && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {([["Total photos", counts.total], ["Shown", counts.published], ["Hidden", counts.hidden]] as const).map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="text-on-surface-variant">{label}</dt>
              <dd className="font-semibold text-on-surface tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* ── Upload ─────────────────────────────────────────────────── */}
      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="gallery-upload-heading">
        <div className="space-y-1">
          <h4 id="gallery-upload-heading" className="font-display text-lg font-semibold text-on-surface">Add photos</h4>
          <p className="text-sm text-on-surface-variant">
            JPG, PNG or WebP. Large photos are compressed before upload. New photos are added at the top; add a title and
            description with Edit.
          </p>
        </div>

        {/* Drag events go to the wrapper: a disabled button gets none, and the
            browser would open a dropped file instead */}
        <div
          onDragOver={(e) => { e.preventDefault(); if (!isUploading && !isFull) setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { if (isUploading || isFull) { e.preventDefault(); setIsDragOver(false); return; } onDrop(e); }}
        >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading || isFull || isLoading}
          aria-describedby="gallery-upload-status"
          className={`panel flex w-full flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-10 text-center text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
            isDragOver ? "border-secondary bg-secondary/10 text-on-surface" : "border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface"
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-gold-ink" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-7 w-7 text-gold-ink" aria-hidden="true" />
          )}
          <span className="font-semibold text-on-surface">
            {uploadProgress
              ? `${uploadProgress.stage === "compressing" ? "Compressing" : "Uploading"} photo ${uploadProgress.done + 1} of ${uploadProgress.total}…`
              : isFull
                ? `The gallery is full (${maxImages} photos)`
                : "Drop photos here, or click to choose"}
          </span>
          {!isUploading && !isFull && <span>You can add several photos at once.</span>}
        </button>
        </div>
        <p id="gallery-upload-status" className="sr-only" aria-live="polite">
          {uploadProgress ? `Uploading photo ${uploadProgress.done + 1} of ${uploadProgress.total}` : ""}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => { const files = e.target.files; if (files?.length) void uploadFiles(Array.from(files)); e.target.value = ""; }}
        />

        <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={publishOnUpload}
            onChange={(e) => setPublishOnUpload(e.target.checked)}
            disabled={isUploading}
            className="mt-0.5 h-4 w-4 shrink-0 rounded"
          />
          <span>
            Show new photos on the gallery page right away
            <span className="block text-xs text-on-surface-variant">Untick to add them hidden, and show them once their titles are ready.</span>
          </span>
        </label>
      </section>

      {/* ── List ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="card h-64 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchGallery()} className="btn btn-secondary btn-sm">Try again</button>
        </div>
      ) : images.length === 0 ? (
        <div className="card p-10 text-center">
          <ImagePlus className="mx-auto mb-3 h-8 w-8 text-outline" aria-hidden="true" />
          <p className="text-sm text-on-surface-variant">No photos yet. Add some above to start the gallery.</p>
        </div>
      ) : (
        <section className="space-y-3" aria-labelledby="gallery-order-heading">
          <div className="notice notice-info text-on-surface-variant">
            <p>
              <span id="gallery-order-heading" className="font-semibold text-on-surface">This order is the order on the gallery page.</span>{" "}
              Drag a row by its handle, or use the arrow buttons. With a keyboard, focus the handle, press Space, move with the
              arrow keys and press Space again. Hidden photos keep their place but are not shown publicly.
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
                draggable: "To reorder, press Space to pick up this photo, use the up and down arrow keys to move, then press Space to drop or Escape to cancel.",
              },
            }}
          >
            <SortableContext items={images.map((i) => i._id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2" aria-busy={isSavingOrder}>
                {images.map((image, index) => (
                  <SortableGalleryRow
                    key={image._id}
                    image={image}
                    position={index + 1}
                    isFirst={index === 0}
                    isLast={index === images.length - 1}
                    reorderDisabled={isSavingOrder || images.length < 2}
                    busyAction={busy?.id === image._id ? busy.action : null}
                    onMove={(offset) => moveImage(image._id, offset)}
                    onEdit={() => setEditing(image)}
                    onToggleVisibility={() => void toggleVisibility(image)}
                    onDelete={() => void removeImage(image)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {editing && (
        <EditPhotoModal
          image={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            patchImage(saved._id, { title: saved.title, description: saved.description, isPublished: saved.isPublished });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableGalleryRow({
  image, position, isFirst, isLast, reorderDisabled, busyAction, onMove, onEdit, onToggleVisibility, onDelete,
}: {
  image: AdminGalleryImage;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  reorderDisabled: boolean;
  busyAction: BusyAction | null;
  onMove: (offset: -1 | 1) => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id: image._id, disabled: reorderDisabled });
  const title = titleOf(image);
  const hasTitle = Boolean(image.title?.en?.trim() || image.title?.bn?.trim());
  const description = image.description?.en?.trim() || image.description?.bn?.trim();
  const missingBangla = Boolean(image.title?.en?.trim() && !image.title?.bn?.trim());
  const spinner = <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
  const arrowClass =
    "flex h-7 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-30";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`card relative p-3 sm:p-4 ${isDragging ? "z-10 border-secondary shadow-xl ring-2 ring-secondary/40" : ""} ${image.isPublished ? "" : "bg-surface-container"}`}
    >
      <div className="flex gap-3">
        {/* Order controls */}
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button type="button" aria-label={`Move ${title} up`} title="Move up" disabled={isFirst}
            aria-disabled={reorderDisabled || undefined} onClick={() => onMove(-1)} className={arrowClass}>
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${title}, position ${position}`}
            title="Drag to reorder"
            aria-disabled={reorderDisabled || undefined}
            className="flex h-9 w-8 touch-none cursor-grab items-center justify-center rounded-md border border-outline bg-surface-raised text-on-surface-variant shadow-sm transition-colors hover:border-secondary hover:text-gold-ink active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-secondary aria-disabled:cursor-progress aria-disabled:opacity-60"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-xs font-semibold tabular-nums text-on-surface-variant" aria-hidden>#{position}</span>
          <button type="button" aria-label={`Move ${title} down`} title="Move down" disabled={isLast}
            aria-disabled={reorderDisabled || undefined} onClick={() => onMove(1)} className={arrowClass}>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onEdit}
            className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container sm:w-40"
            aria-label={`Edit ${title}`}
          >
            <Image
              src={galleryThumbUrl(image.imageUrl, 400)}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 160px"
              className={`object-cover ${image.isPublished ? "" : "opacity-60"}`}
            />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <p className={`mr-1 wrap-break-word font-semibold ${hasTitle ? "text-on-surface" : "italic text-on-surface-variant"}`}>{title}</p>
                <span className="chip">
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${image.isPublished ? "bg-success" : "bg-outline"}`} />
                  {image.isPublished ? "Shown" : "Hidden"}
                </span>
              </div>
              {description ? (
                <p className="line-clamp-2 text-sm text-on-surface-variant">{richTextToPlain(description)}</p>
              ) : (
                <p className="text-sm text-on-surface-variant">No description.</p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
                <span>Added {fmt(image.createdAt)}{image.createdBy?.name ? ` by ${image.createdBy.name}` : ""}</span>
                {missingBangla && <span className="text-gold-ink">No Bangla title (English is shown)</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-0.5 lg:shrink-0 lg:justify-end">
              <button type="button" onClick={onEdit} className="btn btn-secondary btn-sm mr-1.5">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </button>
              <button
                type="button"
                onClick={onToggleVisibility}
                disabled={busyAction !== null}
                title={image.isPublished ? "Hide from the gallery page" : "Show on the gallery page"}
                className="btn btn-ghost btn-icon"
              >
                {busyAction === "visibility" ? spinner : image.isPublished ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                <span className="sr-only">{image.isPublished ? `Hide ${title}` : `Show ${title}`}</span>
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busyAction !== null}
                title="Delete photo"
                className="btn btn-ghost btn-icon hover:text-error"
              >
                {busyAction === "delete" ? spinner : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                <span className="sr-only">Delete {title}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface PhotoForm {
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  isPublished: boolean;
}

function EditPhotoModal({ image, onClose, onSaved }: {
  image: AdminGalleryImage;
  onClose: () => void;
  onSaved: (saved: AdminGalleryImage) => void;
}) {
  const initial = useMemo<PhotoForm>(() => ({
    titleEn: image.title?.en ?? "",
    titleBn: image.title?.bn ?? "",
    descriptionEn: image.description?.en ?? "",
    descriptionBn: image.description?.bn ?? "",
    isPublished: image.isPublished,
  }), [image]);
  const [form, setForm] = useState<PhotoForm>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const set = (key: Exclude<keyof PhotoForm, "isPublished">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const t = {
      titleEn: form.titleEn.trim(), titleBn: form.titleBn.trim(),
      descriptionEn: form.descriptionEn.trim(), descriptionBn: form.descriptionBn.trim(),
    };
    if (form.titleBn.trim() && !t.titleEn) {
      setFormError("Add an English title too: it is shown when a Bangla title is missing, and used as the photo's name.");
      return;
    }

    // Only send what changed
    const payload: Parameters<typeof updateGalleryImage>[1] = {};
    if (t.titleEn !== initial.titleEn.trim() || t.titleBn !== initial.titleBn.trim()) payload.title = { en: t.titleEn, bn: t.titleBn };
    if (t.descriptionEn !== initial.descriptionEn.trim() || t.descriptionBn !== initial.descriptionBn.trim()) {
      payload.description = { en: t.descriptionEn, bn: t.descriptionBn };
    }
    if (form.isPublished !== initial.isPublished) payload.isPublished = form.isPublished;
    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await updateGalleryImage(image._id, payload);
      toast.success("Photo saved");
      onSaved(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save the photo";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const counter = (value: string, max: number) => (
    <span className="hint block text-right tabular-nums">{value.length}/{max}</span>
  );

  return (
    <ModalShell title="Edit photo" onClose={() => { if (!isSubmitting) onClose(); }} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
            {imageFailed ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-on-surface-variant">
                <ImageOff className="h-5 w-5" aria-hidden="true" /> The image could not be loaded
              </div>
            ) : (
              <Image
                src={galleryThumbUrl(image.imageUrl, 1200)}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-contain"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>

          <div className="notice notice-info text-on-surface-variant">
            Leave the Bangla fields empty to show the English text on the Bangla page too. You can format descriptions with headlines, paragraphs, and bullet points.
          </div>

          {formError && <p role="alert" className="notice notice-error">{formError}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Title (English)</span>
              <input value={form.titleEn} onChange={set("titleEn")} maxLength={GALLERY_TITLE_MAX} className="field"
                placeholder="e.g. Our chambers in Dhaka" autoComplete="off" />
              {counter(form.titleEn, GALLERY_TITLE_MAX)}
            </label>
            <label className="block">
              <span className="label">Title (বাংলা)</span>
              <input value={form.titleBn} onChange={set("titleBn")} maxLength={GALLERY_TITLE_MAX} className="field"
                lang="bn" placeholder="যেমন: ঢাকায় আমাদের চেম্বার" autoComplete="off" />
              {counter(form.titleBn, GALLERY_TITLE_MAX)}
            </label>

            <div className="space-y-1 sm:col-span-2">
              <span className="label">Description (English) — paragraphs, headlines, bullet points</span>
              <RichTextEditor
                value={form.descriptionEn}
                onChange={(val) => setForm((f) => ({ ...f, descriptionEn: val }))}
                placeholder="Write description with paragraphs, bullet points, or headlines..."
                maxLength={GALLERY_DESCRIPTION_MAX}
                minHeightClass="min-h-36"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="label">Description (বাংলা) — প্যারাগ্রাফ, শিরোনাম ও পয়েন্ট</span>
              <RichTextEditor
                value={form.descriptionBn}
                onChange={(val) => setForm((f) => ({ ...f, descriptionBn: val }))}
                placeholder="প্যারাগ্রাফ, শিরোনাম বা বুলেট পয়েন্টসহ বিবরণ লিখুন..."
                lang="bn"
                maxLength={GALLERY_DESCRIPTION_MAX}
                minHeightClass="min-h-36"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
            <input type="checkbox" checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded" />
            <span>
              Show on the gallery page
              <span className="block text-xs text-on-surface-variant">Hidden photos stay here and keep their place in the order.</span>
            </span>
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-outline-variant px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, maxWidth, children }: {
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
          <button type="button" aria-label="Close" onClick={onClose} className="btn btn-ghost btn-icon -mr-2 shrink-0">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
