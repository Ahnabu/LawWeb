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
//
// A 403 with code ACCOUNT_BLOCKED (from any API call or from the refresh) means
// an admin blocked this account: the server already cleared the cookies, so the
// tab signs out locally and tells the user why (ACCOUNT_BLOCKED_EVENT).

export const SESSION_EXPIRED_EVENT = 'islamassociates:session-expired'
export const ACCOUNT_BLOCKED_EVENT = 'islamassociates:account-blocked'
export const ACCOUNT_BLOCKED_CODE = 'ACCOUNT_BLOCKED'
export const DEFAULT_BLOCKED_MESSAGE = 'Your account has been blocked. Contact the firm for help.'

// Survives the redirect to /login so the login page can explain the sign-out
const AUTH_NOTICE_KEY = 'islamassociates:auth-notice'

export type AuthMessage =
  | { type: 'refreshed'; expiresAt: number | null }
  | { type: 'signed-in' }
  | { type: 'signed-out' }
  | { type: 'blocked'; message: string }

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
const REFRESH_LOCK = 'islamassociates-auth-refresh'

type RefreshOutcome = 'ok' | 'rejected' | 'blocked' | 'network-error'

let accessTokenExpiresAt: number | null = null
let lastRefreshAt = 0
let refreshInFlight: Promise<RefreshOutcome> | null = null

const channel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('islamassociates-auth') : null

channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data?.type === 'refreshed') {
    accessTokenExpiresAt = event.data.expiresAt
    lastRefreshAt = Date.now()
  } else if (event.data?.type === 'signed-out' || event.data?.type === 'blocked') {
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
    if (response.status === 403) {
      const blockedMessage = await readBlockedMessage(response)
      if (blockedMessage) {
        notifyAccountBlocked(blockedMessage)
        return 'blocked'
      }
    }
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

// The server message when this 403 is an account block, otherwise null
async function readBlockedMessage(response: Response): Promise<string | null> {
  if (response.status !== 403) return null
  const data = await response
    .clone()
    .json()
    .catch(() => null)
  if (data?.code !== ACCOUNT_BLOCKED_CODE) return null
  return typeof data.message === 'string' && data.message ? data.message : DEFAULT_BLOCKED_MESSAGE
}

function saveAuthNotice(message: string) {
  try {
    window.sessionStorage.setItem(AUTH_NOTICE_KEY, message)
  } catch {
    /* storage unavailable: the toast still explains it */
  }
}

// Read once by the login page after a forced sign-out
export function consumeAuthNotice(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const message = window.sessionStorage.getItem(AUTH_NOTICE_KEY)
    if (message) window.sessionStorage.removeItem(AUTH_NOTICE_KEY)
    return message
  } catch {
    return null
  }
}

// Also used for the cross-tab 'blocked' message, hence `broadcast`
export function notifyAccountBlocked(message: string, broadcast = true) {
  if (typeof window === 'undefined') return
  accessTokenExpiresAt = null
  saveAuthNotice(message)
  window.dispatchEvent(new CustomEvent<{ message: string }>(ACCOUNT_BLOCKED_EVENT, { detail: { message } }))
  if (broadcast) broadcastAuth({ type: 'blocked', message })
}

const blockedResponse = () =>
  new Response(JSON.stringify({ message: DEFAULT_BLOCKED_MESSAGE, code: ACCOUNT_BLOCKED_CODE }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })

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
    let pending: RefreshOutcome | null = null
    if (refreshInFlight) {
      pending = await refreshInFlight
    } else if (isKnownExpired()) {
      pending = await refresh()
    }
    // The refresh already signed this tab out; the request would only 401
    if (pending === 'blocked') return blockedResponse()
  }

  const response = await fetch(input, options)

  if (response.status === 403) {
    const blockedMessage = await readBlockedMessage(response)
    if (blockedMessage) notifyAccountBlocked(blockedMessage)
    return response
  }

  if (response.status !== 401 || !canRefresh) {
    return response
  }

  const outcome = await refresh()
  if (outcome === 'blocked') {
    return blockedResponse()
  }
  if (outcome === 'rejected') {
    notifySessionExpired()
    return response
  }
  if (outcome === 'network-error') {
    return response
  }

  return fetch(input, options)
}
