// ── Welcome popup ("Need a Divorce?" …) ───────────────────────────────────────
// Pure scheduling rules for components/PromoPopup.tsx, kept here so they can be
// unit tested (tests/promoPopup.test.ts). Tweak the timing here.

/** Seconds on a page before the popup first appears (not on first paint) */
export const POPUP_FIRST_DELAY_MS = 3_000
/** After the visitor closes it, show it again after this long on the site */
export const POPUP_RESHOW_AFTER_MS = 5 * 60_000
/** At most this many automatic shows per browser session (tab) */
export const POPUP_MAX_SHOWS_PER_SESSION = 3
/** The question slider moves on every this many ms */
export const POPUP_SLIDE_INTERVAL_MS = 4_000
/** Slower auto-advance (and no animation) for prefers-reduced-motion */
export const POPUP_SLIDE_INTERVAL_REDUCED_MS = 8_000

/** i18n keys of the rotating questions (popup.q1 … popup.q12 in lib/i18n.ts) */
export const POPUP_QUESTION_KEYS = Array.from({ length: 12 }, (_, i) => `popup.q${i + 1}`)

/** sessionStorage: { shows, nextAt } for this browser session */
export const POPUP_SESSION_KEY = 'lawweb-popup'
/** localStorage: the question shown last, so the next visit starts elsewhere */
export const POPUP_LAST_INDEX_KEY = 'lawweb-popup-last'

export interface PopupSessionState {
  /** How many times the popup has opened this session */
  shows: number
  /** Epoch ms before which it must not open again (0 = no wait) */
  nextAt: number
}

export const EMPTY_POPUP_SESSION: PopupSessionState = { shows: 0, nextAt: 0 }

/** Reads stored session state; anything malformed counts as a fresh session. */
export function parsePopupSession(raw: string | null | undefined): PopupSessionState {
  if (!raw) return { ...EMPTY_POPUP_SESSION }
  try {
    const value = JSON.parse(raw) as Partial<PopupSessionState> | null
    const shows = Number(value?.shows)
    const nextAt = Number(value?.nextAt)
    return {
      shows: Number.isFinite(shows) && shows > 0 ? Math.floor(shows) : 0,
      nextAt: Number.isFinite(nextAt) && nextAt > 0 ? nextAt : 0,
    }
  } catch {
    return { ...EMPTY_POPUP_SESSION }
  }
}

/** Reads the stored last question index, or null when missing/invalid. */
export function parseLastIndex(raw: string | null | undefined, count: number): number | null {
  if (raw == null || raw === '') return null
  const index = Number(raw)
  return Number.isInteger(index) && index >= 0 && index < count ? index : null
}

/** The question to open on: the one after the last shown, or the first. */
export function nextQuestionIndex(lastIndex: number | null, count: number): number {
  if (count <= 0) return 0
  if (lastIndex == null || !Number.isInteger(lastIndex)) return 0
  return (((lastIndex + 1) % count) + count) % count
}

/** Wraps a slider step (prev/next) around the question list. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

// Routes that never show the popup: dashboards, account and auth pages.
const NO_POPUP_PREFIXES = [
  '/dashboard',
  '/profile',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/system-design',
  '/api',
]

// Public pages with a form in progress: the popup never interrupts them (it
// is closed when the visitor arrives there and waits until they leave).
const FORM_PATHS = ['/appointment', '/contact', '/bn/contact']

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/** Whether the popup may open (or stay open) on this pathname. */
export function canShowPopupOn(pathname: string | null | undefined): boolean {
  const raw = (pathname || '/').split(/[?#]/)[0] || '/'
  const path = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
  if (NO_POPUP_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) return false
  if (FORM_PATHS.some((prefix) => matchesPrefix(path, prefix))) return false
  return true
}

/**
 * Milliseconds to wait before opening the popup on the current page, or null
 * when it must not open this session. Every page visit waits at least
 * POPUP_FIRST_DELAY_MS, and a closed popup waits until `nextAt`.
 */
export function popupDelay(
  state: PopupSessionState,
  now: number,
  firstDelay = POPUP_FIRST_DELAY_MS,
  maxShows = POPUP_MAX_SHOWS_PER_SESSION,
): number | null {
  if (state.shows >= maxShows) return null
  return Math.max(firstDelay, state.nextAt - now)
}

/**
 * Session state after the popup opens at `now`. The wait starts now too, so
 * reloading the page while it is open does not bring it straight back.
 */
export function recordPopupShown(
  state: PopupSessionState,
  now: number,
  reshowAfter = POPUP_RESHOW_AFTER_MS,
): PopupSessionState {
  return { shows: state.shows + 1, nextAt: now + reshowAfter }
}

/** Session state after the visitor closes the popup at `now`. */
export function recordPopupClosed(
  state: PopupSessionState,
  now: number,
  reshowAfter = POPUP_RESHOW_AFTER_MS,
): PopupSessionState {
  return { ...state, nextAt: now + reshowAfter }
}
