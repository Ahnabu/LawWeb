export type UserRole = 'admin' | 'lawyer' | 'client'

export interface AuthUser {
  _id: string
  name: string
  email: string
  role: UserRole
  barId?: string
  phone?: string
  isVerified?: boolean
}

interface LoginResponse {
  message: string
  user: AuthUser
}

import { API_BASE_URL } from './api'

export async function signIn(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }

  return data as LoginResponse
}

export async function fetchSession(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json().catch(() => null)
  return data?.user ?? null
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
