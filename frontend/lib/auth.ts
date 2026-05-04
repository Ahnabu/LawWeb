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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

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
