import { API_BASE_URL } from './api'

// Authenticated fetch for the backend API.
//
// The access-token cookie lives 15 minutes. When it has expired (or is about to),
// the first request that notices starts ONE refresh call; every other request
// made meanwhile waits in the queue for that refresh and is then sent with the
// new cookie. A request that still comes back 401 triggers the same refresh and
// is retried once.
//
// Across tabs: the refresh runs under a Web Lock, so two tabs never rotate the
// refresh token at the same time, and the result is broadcast so the other tabs
// skip their own refresh. Sign-in and sign-out are broadcast the same way.

export const SESSION_EXPIRED_EVENT = 'lawweb:session-expired'

export type AuthMessage =
  | { type: 'refreshed'; expiresAt: number | null }
  | { type: 'signed-in' }
  | { type: 'signed-out' }

// 401 on these means "wrong credentials" or "not logged in", not "token expired"
const NO_REFRESH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify-email',
  '/api/auth/resend-verification-code',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
])

// Refresh this long before the server-side expiry to absorb clock skew and latency
const EXPIRY_MARGIN_MS = 30 * 1000
const REFRESH_LOCK = 'lawweb-auth-refresh'

type RefreshOutcome = 'ok' | 'rejected' | 'network-error'

let accessTokenExpiresAt: number | null = null
let lastRefreshAt = 0
let refreshInFlight: Promise<RefreshOutcome> | null = null

const channel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('lawweb-auth') : null

channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data?.type === 'refreshed') {
    accessTokenExpiresAt = event.data.expiresAt
    lastRefreshAt = Date.now()
  } else if (event.data?.type === 'signed-out') {
    accessTokenExpiresAt = null
  }
})

export function broadcastAuth(message: AuthMessage) {
  channel?.postMessage(message)
}

export function onAuthMessage(handler: (message: AuthMessage) => void): () => void {
  if (!channel) return () => {}
  const listener = (event: MessageEvent<AuthMessage>) => handler(event.data)
  channel.addEventListener('message', listener)
  return () => channel.removeEventListener('message', listener)
}

// Called with the `accessTokenExpiresAt` returned by login/verify/refresh/change-password
export function setAccessTokenExpiry(expiresAt: number | null | undefined) {
  accessTokenExpiresAt = typeof expiresAt === 'number' ? expiresAt : null
}

const isKnownExpired = () =>
  accessTokenExpiresAt !== null && Date.now() >= accessTokenExpiresAt - EXPIRY_MARGIN_MS

const urlPath = (input: string) => {
  try {
    return new URL(input, API_BASE_URL).pathname
  } catch {
    return input
  }
}

const withRefreshLock = (task: () => Promise<RefreshOutcome>): Promise<RefreshOutcome> => {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks) return task()
  // Resolves with the callback's awaited result (the DOM typings nest the promise)
  return locks.request(REFRESH_LOCK, task) as unknown as Promise<RefreshOutcome>
}

async function requestRefresh(): Promise<RefreshOutcome> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })
  } catch {
    // Offline or backend unreachable: the session may be fine, do not sign out
    return 'network-error'
  }

  if (!response.ok) {
    // 5xx is a server problem, not a verdict on the session
    return response.status === 401 ? 'rejected' : 'network-error'
  }

  const data = await response.json().catch(() => null)
  setAccessTokenExpiry(data?.accessTokenExpiresAt)
  lastRefreshAt = Date.now()
  broadcastAuth({ type: 'refreshed', expiresAt: accessTokenExpiresAt })
  return 'ok'
}

// Single-flight within the tab, serialized across tabs by the Web Lock
function refresh(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    const requestedAt = Date.now()
    refreshInFlight = withRefreshLock(async (): Promise<RefreshOutcome> => {
      // Another tab refreshed while this one waited for the lock; the cookies
      // are shared, so this tab is already up to date.
      if (lastRefreshAt >= requestedAt && !isKnownExpired()) return 'ok'
      return requestRefresh()
    })
      .catch((): RefreshOutcome => 'network-error')
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export async function refreshAccessToken(): Promise<boolean> {
  return (await refresh()) === 'ok'
}

const notifySessionExpired = () => {
  if (typeof window === 'undefined') return
  accessTokenExpiresAt = null
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  broadcastAuth({ type: 'signed-out' })
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const options: RequestInit = { credentials: 'include', ...init }
  const canRefresh = !NO_REFRESH_PATHS.has(urlPath(input))

  if (canRefresh) {
    // Queue behind a refresh that is already running, or start one if we know
    // the token has lapsed, instead of sending a request that is bound to fail.
    if (refreshInFlight) {
      await refreshInFlight
    } else if (isKnownExpired()) {
      await refresh()
    }
  }

  const response = await fetch(input, options)

  if (response.status !== 401 || !canRefresh) {
    return response
  }

  const outcome = await refresh()
  if (outcome === 'rejected') {
    notifySessionExpired()
    return response
  }
  if (outcome === 'network-error') {
    return response
  }

  return fetch(input, options)
}
