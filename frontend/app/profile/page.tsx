'use client'

import Link from 'next/link'
import { Footer } from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import { AuthGate } from '../../components/AuthGate'
import { useAuth } from '../../components/AuthProvider'

function ProfileContent() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <section className="px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-4xl card-elevated p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-xl font-semibold text-secondary ring-1 ring-secondary/20">
              {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Profile</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-on-surface">{user.name}</h1>
              <p className="mt-2 text-sm text-on-surface-variant">{user.role}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/dashboard/${user.role}`} className="inline-flex items-center justify-center rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90">
              Dashboard
            </Link>
            <button type="button" onClick={() => void logout()} className="inline-flex items-center justify-center rounded-full border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:border-secondary hover:text-secondary">
              Logout
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-container p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Email</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">{user.email}</p>
          </div>
          <div className="rounded-2xl bg-surface-container p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Role</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">{user.role}</p>
          </div>
          <div className="rounded-2xl bg-surface-container p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Phone</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">{user.phone || 'Not added'}</p>
          </div>
          <div className="rounded-2xl bg-surface-container p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Bar ID</p>
            <p className="mt-2 text-sm font-semibold text-on-surface">{user.barId || 'Not applicable'}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <AuthGate>
        <ProfileContent />
      </AuthGate>
      <Footer />
    </main>
  )
}