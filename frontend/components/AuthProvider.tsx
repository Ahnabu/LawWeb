'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchSession, readRoleCookie, safeRedirectPath, setRoleCookie, signOut, type AuthUser } from '../lib/auth'
import { SESSION_EXPIRED_EVENT, broadcastAuth, onAuthMessage } from '../lib/http'

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

  const applySession = useCallback((session: AuthUser | null) => {
    // The role cookie only steers middleware.ts; keep it in sync with the real
    // session (this also extends its lifetime) instead of treating a mismatch
    // as an attack and signing out.
    setRoleCookie(session?.role ?? null)
    setUser(session)
    setStatus(session ? 'authenticated' : 'unauthenticated')
  }, [])

  const loadSession = useCallback(async () => {
    const startedAt = generation.current
    lastCheckedAt.current = Date.now()
    const session = await fetchSession()

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
    // Every login sets the role hint cookie. Without it there is no session to
    // look up, so anonymous visitors cost the API nothing on page load.
    if (!readRoleCookie()) {
      applySession(null)
      return
    }
    void loadSession()
  }, [applySession, loadSession])

  useEffect(() => {
    // lib/http.ts fires this when a refresh is rejected (session revoked or expired)
    window.addEventListener(SESSION_EXPIRED_EVENT, signOutLocally)

    // Keep every open tab on the same session
    const unsubscribe = onAuthMessage((message) => {
      if (message.type === 'signed-out') {
        signOutLocally()
      } else if (message.type === 'signed-in') {
        generation.current += 1
        void loadSession()
      }
    })

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, signOutLocally)
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
