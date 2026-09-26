'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { dashboardPathFor, type UserRole } from '../lib/auth'

interface AuthGateProps {
  children: React.ReactNode
  allowRoles?: UserRole[]
}

export function AuthGate({ children, allowRoles }: AuthGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, status } = useAuth()

  useEffect(() => {
    if (status === 'authenticated' && allowRoles && user && !allowRoles.includes(user.role)) {
      router.replace(dashboardPathFor(user.role))
    }
  }, [allowRoles, router, status, user])

  useEffect(() => {
    if (status === 'unauthenticated') {
      const redirect = encodeURIComponent(pathname || '/')
      router.replace(`/login?redirect=${redirect}`)
    }
  }, [pathname, router, status])

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 py-20 text-sm text-on-surface-variant">
        Verifying your session...
      </div>
    )
  }

  if (allowRoles && user && !allowRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}