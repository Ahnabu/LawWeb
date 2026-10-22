"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { useLanguage } from "../../components/LanguageProvider";
import { galleryText, galleryThumbUrl, getPublicGallery, type GalleryImage } from "../../lib/gallery";

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

  const num = useCallback((n: number) => n.toLocaleString(locale === "bn" ? "bn-BD" : "en-US"), [locale]);
  const titleAt = (image: GalleryImage, index: number) =>
    galleryText(image.title, locale) || `${t("gallery.untitled")} ${num(index + 1)}`;

  const close = useCallback(() => {
    setOpenIndex((current) => {
      if (current !== null) window.setTimeout(() => tileRefs.current[current]?.focus(), 0);
      return null;
    });
  }, []);

  return (
    <main className="min-h-screen bg-surface">
      <Navbar />
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t("gallery.label")}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t("gallery.title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">{t("gallery.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {status === "loading" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card animate-pulse overflow-hidden">
                <div className="aspect-[4/3] bg-surface-container" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 rounded bg-surface-container-high" />
                  <div className="h-3 w-full rounded bg-surface-container-high" />
                </div>
              </div>
            ))}
          </div>
        ) : status === "error" ? (
          <div className="notice notice-error flex flex-wrap items-center justify-center gap-3 text-center" role="alert">
            <span>{t("gallery.loadError")}</span>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn btn-secondary btn-sm">
              {t("gallery.retry")}
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="py-16 text-center">
            <Images aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-outline" />
            <p className="text-on-surface-variant">{t("gallery.empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => {
              const title = galleryText(image.title, locale);
              const description = galleryText(image.description, locale);
              return (
                <li key={image._id}>
                  <figure className="card card-interactive flex h-full flex-col overflow-hidden">
                    <button
                      type="button"
                      ref={(el) => { tileRefs.current[index] = el; }}
                      onClick={() => setOpenIndex(index)}
                      aria-label={`${t("gallery.open")}: ${titleAt(image, index)}`}
                      className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-outline-variant bg-surface-container focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary"
                    >
                      <Image
                        src={galleryThumbUrl(image.imageUrl, 800)}
                        alt={titleAt(image, index)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    </button>
                    {(title || description) && (
                      <figcaption className="flex-1 p-4">
                        {title && <p className="font-display text-base font-semibold leading-snug text-heading">{title}</p>}
                        {description && (
                          <p className={`line-clamp-3 text-sm leading-6 text-on-surface-variant ${title ? "mt-1.5" : ""}`}>{description}</p>
                        )}
                      </figcaption>
                    )}
                  </figure>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {openIndex !== null && images[openIndex] && (
        <Lightbox
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

// ── Larger view ───────────────────────────────────────────────────────────────
// Esc closes; Left/Right arrows (and swipes) move between photos; Tab stays inside.

function Lightbox({ images, index, onIndexChange, onClose, titleAt, num }: {
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
  const hasTitle = Boolean(galleryText(image.title, locale));

  const go = useCallback(
    (offset: -1 | 1) => onIndexChange((index + offset + total) % total),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowLeft" && total > 1) { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight" && total > 1) { e.preventDefault(); go(1); }
      else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose, total]);

  // Warm the cache for the neighbours so arrowing through feels instant
  useEffect(() => {
    if (total < 2) return;
    for (const offset of [-1, 1]) {
      const next = images[(index + offset + total) % total];
      const img = new window.Image();
      img.src = galleryThumbUrl(next.imageUrl, 1800);
    }
  }, [images, index, total]);

  const counter = t("gallery.counter").replace("{n}", num(index + 1)).replace("{total}", num(total));
  const navButton =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-secondary";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={titleAt(image, index)}
      className="fixed inset-0 z-[60] flex flex-col bg-[rgb(6_12_24/0.94)] text-white"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="text-sm tabular-nums text-white/75" aria-live="polite">{counter}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/45 transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-secondary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{t("gallery.close")}</span>
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 px-2 sm:px-16"
        onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start === null || end === undefined || total < 2) return;
          const delta = end - start;
          if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
        }}
      >
        <div className="relative h-full w-full">
          <Image
            key={image._id}
            src={galleryThumbUrl(image.imageUrl, 1800)}
            alt={titleAt(image, index)}
            fill
            sizes="100vw"
            className="select-none object-contain"
            draggable={false}
            priority
          />
        </div>
        {total > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${navButton} left-2 sm:left-4`}>
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">{t("gallery.previous")}</span>
            </button>
            <button type="button" onClick={() => go(1)} className={`${navButton} right-2 sm:right-4`}>
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">{t("gallery.next")}</span>
            </button>
          </>
        )}
      </div>

      {(hasTitle || description) && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-4 text-center sm:px-6">
          {hasTitle && <p className="font-display text-lg font-semibold text-white">{titleAt(image, index)}</p>}
          {description && (
            <p className="mx-auto mt-1.5 max-h-28 overflow-y-auto whitespace-pre-line text-sm leading-6 text-white/80">{description}</p>
          )}
        </div>
      )}
      {!hasTitle && !description && <div className="pb-6" />}
    </div>
  );
}
