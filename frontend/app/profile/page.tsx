'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGate } from '../../components/AuthGate'
import { useAuth } from '../../components/AuthProvider'

// Account details moved into the dashboards (admin Settings, client/lawyer
// Profile). middleware.ts redirects there first; this covers the rest.
const accountPathByRole = {
  admin: '/dashboard/admin/settings',
  lawyer: '/dashboard/lawyer/profile',
  client: '/dashboard/client/profile',
} as const

function RedirectToAccount() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace(accountPathByRole[user.role])
  }, [user, router])

  return null
}

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-surface">
      <AuthGate>
        <RedirectToAccount />
      </AuthGate>
    </main>
  )
}
