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

  const details = [
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role },
    { label: 'Phone', value: user.phone || 'Not added' },
    { label: 'Bar ID', value: user.barId || 'Not applicable' },
  ]

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="card mx-auto max-w-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="monogram h-14 w-14 text-lg">
              {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-on-surface-variant">Profile</p>
              <h1 className="text-2xl text-heading sm:text-3xl">{user.name}</h1>
              <p className="mt-0.5 text-sm capitalize text-on-surface-variant">{user.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/${user.role}`} className="btn btn-primary">
              Dashboard
            </Link>
            <button type="button" onClick={() => void logout()} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <dl className="panel mt-8 grid sm:grid-cols-2">
          {details.map((item, index) => (
            <div
              key={item.label}
              className={`px-5 py-4 ${index > 0 ? 'border-t border-outline-variant' : ''} ${index === 1 ? 'sm:border-t-0 sm:border-l' : ''} ${index === 3 ? 'sm:border-l' : ''}`}
            >
              <dt className="text-sm text-on-surface-variant">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-on-surface">{item.value}</dd>
            </div>
          ))}
        </dl>
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