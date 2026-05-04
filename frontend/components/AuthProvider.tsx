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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: 'loading',
  login: () => {},
  logout: async () => {},
  refreshSession: async () => null,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const loadSession = async () => {
    const session = await fetchSession()
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
    }),
    [user, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}