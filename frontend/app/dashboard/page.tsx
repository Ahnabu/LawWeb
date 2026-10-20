'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGate } from '../../components/AuthGate'
import { useAuth } from '../../components/AuthProvider'
import { dashboardPathFor } from '../../lib/auth'

// middleware.ts sends signed-in visitors of /login here. The hint cookie holds
// no role, so the verified session decides which dashboard to open.
function RedirectToDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace(dashboardPathFor(user.role))
  }, [user, router])

  return null
}

export default function DashboardIndexPage() {
  return (
    <main className="min-h-screen bg-surface">
      <AuthGate>
        <RedirectToDashboard />
      </AuthGate>
    </main>
  )
}
