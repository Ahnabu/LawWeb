'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchSession, signOut, type AuthUser } from '../lib/auth'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const setPostAuthRedirect = (path: string) => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem('postAuthRedirect', path)
  }

  const consumePostAuthRedirect = () => {
    if (typeof window === 'undefined') {
      return null
    }

    const redirect = window.localStorage.getItem('postAuthRedirect')
    if (redirect) {
      window.localStorage.removeItem('postAuthRedirect')
    }

    return redirect
  }

  const getCookieValue = (name: string) => {
    if (typeof document === 'undefined') {
      return null
    }

    const value = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(`${name}=`))

    return value ? decodeURIComponent(value.split('=')[1]) : null
  }

  const loadSession = async () => {
    const session = await fetchSession()

    if (session && typeof document !== 'undefined') {
      const cookieRole = getCookieValue('userRole')
      if (cookieRole && cookieRole !== session.role) {
        await signOut()
        setUser(null)
        setStatus('unauthenticated')
        return null
      }
    }

    setUser(session)
    setStatus(session ? 'authenticated' : 'unauthenticated')
    return session
  }

  useEffect(() => {
    void loadSession()
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const handleFocus = () => {
      void loadSession()
    }

    const intervalId = window.setInterval(() => {
      void loadSession()
    }, 10 * 60 * 1000)

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.clearInterval(intervalId)
    }
  }, [status])

  const value = useMemo(
    () => ({
      user,
      status,
      login: (nextUser: AuthUser) => {
        setUser(nextUser)
        setStatus('authenticated')
      },
      logout: async () => {
        await signOut()
        setUser(null)
        setStatus('unauthenticated')
      },
      refreshSession: loadSession,
      setPostAuthRedirect,
      consumePostAuthRedirect,
    }),
    [user, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}