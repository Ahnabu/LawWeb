'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SessionCheckError, fetchSession, hasSessionHint, safeRedirectPath, setSessionHint, signOut, type AuthUser } from '../lib/auth'
import { toast } from 'sonner'
import {
  ACCOUNT_BLOCKED_EVENT,
  DEFAULT_BLOCKED_MESSAGE,
  SESSION_EXPIRED_EVENT,
  broadcastAuth,
  notifyAccountBlocked,
  onAuthMessage,
} from '../lib/http'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  login: (user: AuthUser) => void
  logout: () => Promise<void>
  refreshSession: () => Promise<AuthUser | null>
  setPostAuthRedirect: (path: string) => void
  consumePostAuthRedirect: () => string | null
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: 'loading',
  login: () => {},
  logout: async () => {},
  refreshSession: async () => null,
  setPostAuthRedirect: () => {},
  consumePostAuthRedirect: () => null,
})

export function useAuth() {
  return useContext(AuthContext)
}

// A returning tab re-checks the session at most this often (role changes,
// forced password change, revocation from another device)
const REVALIDATE_AFTER_MS = 5 * 60 * 1000

const setPostAuthRedirect = (path: string) => {
  const safe = safeRedirectPath(path)
  if (typeof window === 'undefined' || !safe) {
    return
  }

  window.localStorage.setItem('postAuthRedirect', safe)
}

const consumePostAuthRedirect = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const redirect = window.localStorage.getItem('postAuthRedirect')
  if (redirect) {
    window.localStorage.removeItem('postAuthRedirect')
  }

  return safeRedirectPath(redirect)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Bumped by every login/logout. A session check that started before one of
  // those must not overwrite its result: on a slow (cold-start) backend the
  // initial /profile call used to resolve AFTER the user had logged in and
  // wipe the fresh session, which looked like a spontaneous logout.
  const generation = useRef(0)
  const lastCheckedAt = useRef(0)
  const currentUser = useRef<AuthUser | null>(null)

  const applySession = useCallback((session: AuthUser | null) => {
    // The hint cookie only steers middleware.ts; keep it in sync with the real
    // session (this also extends its lifetime and migrates the old userRole cookie)
    setSessionHint(Boolean(session))
    currentUser.current = session
    setUser(session)
    setStatus(session ? 'authenticated' : 'unauthenticated')
  }, [])

  const loadSession = useCallback(async () => {
    const startedAt = generation.current
    lastCheckedAt.current = Date.now()

    let session: AuthUser | null
    try {
      session = await fetchSession()
    } catch (error) {
      if (!(error instanceof SessionCheckError)) throw error
      // Backend down or erroring: an open session stays as it is (a revalidation
      // during an outage used to sign everyone out). With no session yet there is
      // nothing to keep, so the visitor is treated as signed out, as before.
      if (startedAt === generation.current && !currentUser.current) {
        applySession(null)
      }
      return currentUser.current
    }

    if (startedAt !== generation.current) {
      return session
    }

    applySession(session)
    return session
  }, [applySession])

  const signOutLocally = useCallback(() => {
    generation.current += 1
    applySession(null)
  }, [applySession])

  useEffect(() => {
    // Every login sets the session hint cookie. Without it there is no session to
    // look up, so anonymous visitors cost the API nothing on page load.
    if (!hasSessionHint()) {
      applySession(null)
      return
    }
    void loadSession()
  }, [applySession, loadSession])

  useEffect(() => {
    // lib/http.ts fires this when a refresh is rejected (session revoked or expired)
    window.addEventListener(SESSION_EXPIRED_EVENT, signOutLocally)

    // lib/http.ts fires this when the API answers ACCOUNT_BLOCKED. The server has
    // already cleared the cookies; drop the local session and say why. The fixed
    // toast id keeps parallel failing requests from stacking several toasts.
    const onBlocked = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message || DEFAULT_BLOCKED_MESSAGE
      signOutLocally()
      toast.error(message, { id: 'account-blocked', duration: 10000 })
    }
    window.addEventListener(ACCOUNT_BLOCKED_EVENT, onBlocked)

    // Keep every open tab on the same session
    const unsubscribe = onAuthMessage((message) => {
      if (message.type === 'signed-out') {
        signOutLocally()
      } else if (message.type === 'blocked') {
        // Re-dispatch locally (no re-broadcast) so this tab shows the notice too
        notifyAccountBlocked(message.message, false)
      } else if (message.type === 'signed-in') {
        generation.current += 1
        void loadSession()
      }
    })

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, signOutLocally)
      window.removeEventListener(ACCOUNT_BLOCKED_EVENT, onBlocked)
      unsubscribe()
    }
  }, [loadSession, signOutLocally])

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const revalidateIfStale = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheckedAt.current >= REVALIDATE_AFTER_MS) {
        void loadSession()
      }
    }

    // Hidden tabs make no requests; a tab coming back checks once if stale
    document.addEventListener('visibilitychange', revalidateIfStale)
    const intervalId = window.setInterval(revalidateIfStale, REVALIDATE_AFTER_MS)

    return () => {
      document.removeEventListener('visibilitychange', revalidateIfStale)
      window.clearInterval(intervalId)
    }
  }, [status, loadSession])

  const login = useCallback((nextUser: AuthUser) => {
    generation.current += 1
    lastCheckedAt.current = Date.now()
    applySession(nextUser)
    broadcastAuth({ type: 'signed-in' })
  }, [applySession])

  const logout = useCallback(async () => {
    generation.current += 1
    await signOut()
    // Discard any session check that started while the logout was in flight
    signOutLocally()
    broadcastAuth({ type: 'signed-out' })
  }, [signOutLocally])

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      refreshSession: loadSession,
      setPostAuthRedirect,
      consumePostAuthRedirect,
    }),
    [user, status, login, logout, loadSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
