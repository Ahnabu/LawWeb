"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Images,
  X,
} from "lucide-react";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { useLanguage } from "../../components/LanguageProvider";
import { RichText } from "../../components/RichText";
import { richTextToPlain } from "../../lib/richText";
import {
  galleryText,
  galleryThumbUrl,
  getPublicGallery,
  type GalleryImage,
} from "../../lib/gallery";

// Public photo gallery: photos, titles and descriptions come from the admin
// Gallery page (GET /api/gallery, published only, in the admin's order).

export default function GalleryPage() {
  const { t, locale } = useLanguage();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // The tile that opened the viewer gets focus back when it closes
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    getPublicGallery(controller.signal)
      .then((rows) => {
        setImages(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [attempt]);

  const num = useCallback(
    (n: number) => n.toLocaleString(locale === "bn" ? "bn-BD" : "en-US"),
    [locale]
  );

  const titleAt = useCallback(
    (image: GalleryImage, index: number) =>
      galleryText(image.title, locale) || `${t("gallery.untitled")} ${num(index + 1)}`,
    [locale, num, t]
  );

  const close = useCallback(() => {
    setOpenIndex((current) => {
      if (current !== null) {
        window.setTimeout(() => tileRefs.current[current]?.focus(), 0);
      }
      return null;
    });
  }, []);

  return (
    <main className="min-h-screen bg-surface">
      <Navbar />

      {/* Hero Banner */}
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t("gallery.label")}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t("gallery.title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
            {t("gallery.subtitle")}
          </p>
        </div>
      </section>

      {/* Gallery Grid: Pure edge-to-edge photo tiles with hover overlay (no boxy bottom card) */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {status === "loading" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-surface-container aspect-[4/3]" />
            ))}
          </div>
        ) : status === "error" ? (
          <div
            className="notice notice-error flex flex-wrap items-center justify-center gap-3 text-center"
            role="alert"
          >
            <span>{t("gallery.loadError")}</span>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="btn btn-secondary btn-sm"
            >
              {t("gallery.retry")}
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="py-16 text-center">
            <Images aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-outline" />
            <p className="text-on-surface-variant">{t("gallery.empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => {
              const rawDescription = galleryText(image.description, locale);
              const plainSnippet = richTextToPlain(rawDescription, 140);
              const displayTitle = titleAt(image, index);

              return (
                <li key={image._id}>
                  <button
                    type="button"
                    ref={(el) => {
                      tileRefs.current[index] = el;
                    }}
                    onClick={() => setOpenIndex(index)}
                    aria-label={`${t("gallery.open")}: ${displayTitle}`}
                    className="group relative block aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container text-left shadow-md transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl hover:border-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary"
                  >
                    <Image
                      src={galleryThumbUrl(image.imageUrl, 800)}
                      alt={displayTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-108 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />

                    {/* Desktop Hover Overlay: smoothly darkens on hover and shows title + description snippet */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 z-10 hidden sm:flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/45 to-transparent p-5 opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <div className="transform translate-y-3 transition-transform duration-300 group-hover:translate-y-0">
                        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-secondary/90 px-2.5 py-0.5 text-[11px] font-semibold text-on-secondary shadow-md backdrop-blur-md">
                          <Eye className="h-3 w-3" />
                          {t("gallery.viewDetails")}
                        </span>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white drop-shadow-md line-clamp-1">
                          {displayTitle}
                        </h3>
                        {plainSnippet ? (
                          <p className="mt-1 line-clamp-2 text-xs sm:text-sm leading-relaxed text-white/90 drop-shadow">
                            {plainSnippet}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-white/75 italic">
                            {t("gallery.firmTag")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mobile Bottom Overlay: subtle permanent gradient directly on photo */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 z-10 sm:hidden bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3.5 pt-8 pointer-events-none"
                    >
                      <h3 className="font-display text-sm font-bold text-white line-clamp-1 drop-shadow">
                        {displayTitle}
                      </h3>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
                        <Eye className="h-3 w-3" />
                        {t("gallery.viewDetails")}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pop-up Modal */}
      {openIndex !== null && images[openIndex] && (
        <GalleryModal
          images={images}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={close}
          titleAt={titleAt}
          num={num}
        />
      )}

      <Footer />
      <WhatsAppCta />
    </main>
  );
}

// ── Interactive Pop-up Modal ──────────────────────────────────────────────────
// - Photo adapts naturally without a fixed area and without ANY scrollbar on the image.
// - Clean UI: technical metadata (Date, Index) and external link hidden.
// - On mobile & smaller screens: high-end unified view where the photo and rich description
//   scroll seamlessly together for effortless reading of paragraphs, points, and headlines.
// - On desktop: side-by-side split view with full-size photo on left and details on right.

function GalleryModal({
  images,
  index,
  onIndexChange,
  onClose,
  titleAt,
  num,
}: {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  titleAt: (image: GalleryImage, index: number) => string;
  num: (n: number) => string;
}) {
  const { t, locale } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const image = images[index];
  const total = images.length;
  const description = galleryText(image.description, locale);
  const title = titleAt(image, index);

  const go = useCallback(
    (offset: -1 | 1) => onIndexChange((index + offset + total) % total),
    [index, total, onIndexChange]
  );

  // Lock body scroll and set focus to close button
  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Keyboard navigation & focus trap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && total > 1) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight" && total > 1) {
        e.preventDefault();
        go(1);
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]:not([disabled]), [tabindex="0"]'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose, total]);

  // Warm image cache for adjacent neighbours
  useEffect(() => {
    if (total < 2) return;
    for (const offset of [-1, 1]) {
      const next = images[(index + offset + total) % total];
      const img = new window.Image();
      img.src = galleryThumbUrl(next.imageUrl, 1800);
    }
  }, [images, index, total]);

  const counter = t("gallery.counter")
    .replace("{n}", num(index + 1))
    .replace("{total}", num(total));

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-0 sm:p-4 lg:p-8 backdrop-blur-xl animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── MOBILE & SMALL SCREENS MODAL (< lg) ──────────────────────────────
          Full height modal with smooth continuous scroll.
          The photo does NOT have a scrollbar and does NOT take a fixed height.
          Readability of paragraphs, headlines and bullet points is 100% natural. */}
      <div className="flex h-full w-full flex-col bg-surface-container-lowest lg:hidden sm:h-[94vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-outline-variant/30 sm:shadow-2xl overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
              <Building2 className="h-3 w-3" />
              {t("gallery.firmTag")}
            </span>
            <span
              className="inline-flex items-center rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold tabular-nums text-on-surface-variant"
              aria-live="polite"
            >
              {counter}
            </span>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-high text-on-surface-variant hover:text-heading"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t("gallery.close")}</span>
          </button>
        </div>

        {/* Mobile Scrollable Body: photo + description flow smoothly together */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start === null || end === undefined || total < 2) return;
            const delta = end - start;
            if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
          }}
        >
          {/* Photo container: No fixed height, NO scrollbar */}
          <div className="relative flex w-full items-center justify-center rounded-xl bg-black/95 p-2 overflow-hidden shadow-inner">
            <Image
              key={image._id}
              src={galleryThumbUrl(image.imageUrl, 1800)}
              alt={title}
              width={1600}
              height={1200}
              unoptimized
              priority
              className="max-h-[48vh] w-auto h-auto max-w-full select-none rounded-lg object-contain shadow-md"
              draggable={false}
            />

            {/* Left / Right Nav Arrows on Photo */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t("gallery.previous")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t("gallery.next")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md active:scale-95"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Title */}
          <h2 className="font-display text-xl sm:text-2xl font-bold leading-snug text-heading">
            {title}
          </h2>

          {/* Rich Description */}
          {description ? (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/80 p-4">
              <RichText value={description} size="base" tone="strong" />
            </div>
          ) : null}

          {/* Bottom Nav Controls for Thumb Navigation */}
          {total > 1 && (
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                className="btn btn-secondary btn-sm flex-1 flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t("gallery.previous")}</span>
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="btn btn-secondary btn-sm flex-1 flex items-center justify-center gap-1.5"
              >
                <span>{t("gallery.next")}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP VIEW MODAL (lg:flex) ────────────────────────────────────
          Side-by-side layout: Full-bleed photo on left, details on right.
          Photo container adapts cleanly without any scrollbar on the image. */}
      <div className="hidden lg:flex relative max-h-[90vh] w-full max-w-5xl flex-row overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl">
        {/* Left Section: Photo (NO scrollbar, NO fixed height) */}
        <div className="relative flex flex-1 items-center justify-center bg-black/95 p-6 overflow-hidden lg:w-3/5">
          <Image
            key={image._id}
            src={galleryThumbUrl(image.imageUrl, 1800)}
            alt={title}
            width={1600}
            height={1200}
            unoptimized
            priority
            className="max-h-[78vh] w-auto h-auto max-w-full select-none rounded-xl object-contain shadow-2xl"
            draggable={false}
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("gallery.previous")}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 focus-visible:outline-2 focus-visible:outline-secondary"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("gallery.next")}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 focus-visible:outline-2 focus-visible:outline-secondary"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {/* Right Section: Details Panel */}
        <div className="flex w-full flex-col border-l border-outline-variant/30 bg-surface-container-low min-h-0 lg:w-[380px] xl:w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/80 px-5 py-3.5">
            <span
              className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold tabular-nums text-on-surface-variant"
              aria-live="polite"
            >
              {counter}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-heading focus-visible:outline-2 focus-visible:outline-secondary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{t("gallery.close")}</span>
            </button>
          </div>

          {/* Scrollable Information Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6 min-h-0 overscroll-contain">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("gallery.firmTag")}
              </span>
            </div>

            <h2 className="font-display text-xl font-bold leading-snug text-heading sm:text-2xl">
              {title}
            </h2>

            {description ? (
              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-4">
                <RichText value={description} size="base" tone="strong" />
              </div>
            ) : null}
          </div>

          {/* Desktop Footer Controls */}
          {total > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-lowest/80 p-4">
              <button
                type="button"
                onClick={() => go(-1)}
                className="btn btn-secondary btn-sm flex flex-1 items-center justify-center gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>{t("gallery.previous")}</span>
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="btn btn-secondary btn-sm flex flex-1 items-center justify-center gap-1.5"
              >
                <span>{t("gallery.next")}</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
