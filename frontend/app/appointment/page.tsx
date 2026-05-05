'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider'

export default function AppointmentRedirectPage() {
  const router = useRouter()
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'authenticated') {
      router.replace('/dashboard/client/appointment')
      return
    }

    const redirect = encodeURIComponent('/dashboard/client/appointment')
    router.replace(`/login?redirect=${redirect}`)
  }, [router, status])

  return null
}
