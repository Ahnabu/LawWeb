export type UserRole = 'admin' | 'lawyer' | 'client'

export interface AuthUser {
  _id: string
  name: string
  email: string
  role: UserRole
  barId?: string
  phone?: string
  profileImageUrl?: string
  isVerified?: boolean
  passwordNeedsChange?: boolean
}

interface LoginResponse {
  message: string
  user: AuthUser
}

interface RegisterResponse {
  message: string
  verificationRequired: true
  email: string
}

interface VerificationResponse {
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

export async function signUp(
  name: string,
  email: string,
  password: string,
  role: 'lawyer' | 'client' = 'client',
  phone: string,
  barId?: string,
): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      name,
      email,
      password,
      role,
      phone,
      barId,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed')
  }

  return data as RegisterResponse
}

export async function verifyEmail(email: string, code: string): Promise<VerificationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, code }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Verification failed')
  }

  return data as VerificationResponse
}

export async function resendVerificationCode(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Unable to resend verification code')
  }

  return data as { message: string }
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
