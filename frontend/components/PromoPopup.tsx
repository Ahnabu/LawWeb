"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ChevronLeft, ChevronRight, Mail, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { useSiteSettings } from "./contentHooks";
import { WhatsAppMark } from "./WhatsAppCta";
import {
  POPUP_LAST_INDEX_KEY,
  POPUP_QUESTION_KEYS,
  POPUP_SESSION_KEY,
  POPUP_SLIDE_INTERVAL_MS,
  POPUP_SLIDE_INTERVAL_REDUCED_MS,
  canShowPopupOn,
  nextQuestionIndex,
  parseLastIndex,
  parsePopupSession,
  popupDelay,
  recordPopupClosed,
  recordPopupShown,
  wrapIndex,
  type PopupSessionState,
} from "../lib/promoPopup";

// Welcome popup with a rotating "Need a Divorce?"-style question. Mounted once
// in app/layout.tsx; shows on public pages only. Timing and route rules live
// in lib/promoPopup.ts (POPUP_* constants at the top). Texts are the popup.*
// keys in lib/i18n.ts, editable in the CMS under Navigation & Footer.

const QUESTION_COUNT = POPUP_QUESTION_KEYS.length;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Storage can throw (private mode, blocked site data): the popup then just
// behaves as if this were a fresh visit.
function readSession(): PopupSessionState {
  try {
    return parsePopupSession(window.sessionStorage.getItem(POPUP_SESSION_KEY));
  } catch {
    return parsePopupSession(null);
  }
}

function writeSession(state: PopupSessionState) {
  try {
    window.sessionStorage.setItem(POPUP_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Not persisted: only this page view remembers it
  }
}

function readLastIndex(): number | null {
  try {
    return parseLastIndex(window.localStorage.getItem(POPUP_LAST_INDEX_KEY), QUESTION_COUNT);
  } catch {
    return null;
  }
}

function writeLastIndex(index: number) {
  try {
    window.localStorage.setItem(POPUP_LAST_INDEX_KEY, String(index));
  } catch {
    // Not persisted: the next visit starts from the first question
  }
}

export function PromoPopup() {
  const { t, localePath } = useLanguage();
  const { whatsappHref } = useSiteSettings();
  const pathname = usePathname() ?? "/";
  const allowed = canShowPopupOn(pathname);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Bumped to re-run the scheduler (e.g. when a hidden tab becomes visible)
  const [scheduleTick, setScheduleTick] = useState(0);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  const titleId = useId();
  const textId = useId();

  const paused = hovered || focused;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const openPopup = useCallback(() => {
    const session = readSession();
    if (popupDelay(session, Date.now()) === null) return;
    writeSession(recordPopupShown(session, Date.now()));
    const start = nextQuestionIndex(lastIndexRef.current ?? readLastIndex(), QUESTION_COUNT);
    setIndex(start);
    setDirection(1);
    setHovered(false);
    setFocused(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    writeSession(recordPopupClosed(readSession(), Date.now()));
    setOpen(false);
  }, []);

  // Scheduler: on an allowed page, open once the wait is over (at least
  // POPUP_FIRST_DELAY_MS on each page). Not in a background tab.
  useEffect(() => {
    if (open || !allowed) return;
    const delay = popupDelay(readSession(), Date.now());
    if (delay === null) return;

    let onVisible: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "hidden") {
        onVisible = () => {
          if (document.visibilityState === "visible") setScheduleTick((n) => n + 1);
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      openPopup();
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, allowed, pathname, scheduleTick, openPopup]);

  // Navigating to a form or private page (e.g. browser back) closes it
  useEffect(() => {
    if (open && !allowed) close();
  }, [open, allowed, close]);

  // Remember the question on screen so the next show starts on a new one
  useEffect(() => {
    if (!open) return;
    lastIndexRef.current = index;
    writeLastIndex(index);
  }, [open, index]);

  // Slider auto-advance (restarts after every change, waits while paused)
  useEffect(() => {
    if (!open || paused) return;
    const timer = window.setTimeout(
      () => {
        setDirection(1);
        setIndex((i) => wrapIndex(i + 1, QUESTION_COUNT));
      },
      reducedMotion ? POPUP_SLIDE_INTERVAL_REDUCED_MS : POPUP_SLIDE_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [open, paused, index, reducedMotion]);

  // Focus in on open, back on close; Esc closes; Tab stays inside; no page scroll
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const outside = !dialog.contains(active);
      if (e.shiftKey && (outside || active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [open, close]);

  if (!open) return null;

  const go = (step: 1 | -1) => {
    setDirection(step);
    setIndex((i) => wrapIndex(i + step, QUESTION_COUNT));
  };

  const goTo = (target: number) => {
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    setIndex(target);
  };

  const onSliderKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const onSliderBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  const questions = POPUP_QUESTION_KEYS.map((key) => t(key));
  const dotLabel = (n: number) =>
    t("popup.goTo").replace("{n}", String(n)).replace("{total}", String(QUESTION_COUNT));

  return (
    <div
      className="promo-backdrop fixed inset-0 z-100 flex items-end justify-center bg-[rgb(10_22_40/0.6)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        tabIndex={-1}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHovered(false);
        }}
        className="promo-dialog card max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto shadow-2xl outline-none"
      >
        {/* Navy band: firm, rotating question, slider controls */}
        <div className="relative rounded-t-[11px] bg-[linear-gradient(180deg,var(--hero-from)_0%,var(--hero-to)_100%)] px-5 pb-4 pt-5 text-white sm:px-6">
          <div className="flex items-center gap-3 pr-10">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white">
              <Image src="/logo.jpg" alt="" width={36} height={36} className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0">
              <p id={titleId} className="text-sm font-semibold text-[#d9bd6d]">
                {t("popup.title")}
              </p>
              <p className="truncate text-xs text-white/70">{t("site.firmName")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("popup.close")}
            className="btn btn-on-dark btn-icon absolute right-3 top-3 h-9 min-h-9 w-9"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>

          <div
            role="group"
            aria-roledescription="carousel"
            aria-label={t("popup.questionsLabel")}
            onFocus={() => setFocused(true)}
            onBlur={onSliderBlur}
            onKeyDown={onSliderKeyDown}
          >
            {/* Every question sits in one grid cell, so the box keeps the
                height of the longest one and nothing jumps as it rotates */}
            <div className="mt-5 grid">
              {questions.map((question, i) => (
                <p
                  key={i}
                  aria-hidden="true"
                  className="invisible font-display text-[1.375rem] font-semibold leading-snug [grid-area:1/1] sm:text-2xl"
                >
                  {question}
                </p>
              ))}
              <div aria-live={paused ? "polite" : "off"} aria-atomic="true" className="flex items-center [grid-area:1/1]">
                <p
                  key={index}
                  className={`font-display text-[1.375rem] font-semibold leading-snug text-white sm:text-2xl ${reducedMotion ? "" : "promo-slide"}`}
                  style={{ "--promo-dir": direction } as CSSProperties}
                >
                  {questions[index]}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={dotLabel(i + 1)}
                    aria-current={i === index ? "true" : undefined}
                    className="flex h-6 w-3 items-center justify-center rounded-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-1.5 rounded-full transition-all duration-200 ${i === index ? "w-2.5 bg-[#c9a84c]" : "w-1.5 bg-white/35"}`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t("popup.previous")}
                  className="btn btn-on-dark btn-icon h-8 min-h-8 w-8"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t("popup.next")}
                  className="btn btn-on-dark btn-icon h-8 min-h-8 w-8"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p id={textId} className="text-sm leading-6 text-on-surface-variant">
            {t("popup.text")}
          </p>
          <div className="mt-4 grid gap-2">
            <Link href={localePath("/appointment")} onClick={close} className="btn btn-primary btn-block">
              <CalendarCheck aria-hidden="true" className="h-4 w-4" />
              {t("popup.book")}
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href={localePath("/contact")} onClick={close} className="btn btn-secondary px-3">
                <Mail aria-hidden="true" className="h-4 w-4" />
                {t("popup.contact")}
              </Link>
              <a
                href={whatsappHref(t("site.whatsappMessage"))}
                target="_blank"
                rel="noreferrer"
                onClick={close}
                className="btn btn-secondary px-3"
              >
                <WhatsAppMark className="h-4 w-4 text-[#1fae55]" />
                {t("popup.whatsapp")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
