import { NextRequest, NextResponse } from 'next/server'

const dashboardPathByRole: Record<string, string> = {
  admin: '/dashboard/admin',
  lawyer: '/dashboard/lawyer',
  client: '/dashboard/client',
}

// Use the env var directly — importing lib/api.ts can fail on the Edge runtime
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000'

async function readSession(cookieHeader: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!response.ok) return null
    return response.json().catch(() => null)
  } catch {
    // Backend unreachable — treat as unauthenticated, don't crash
    return null
  }
}

export async function middleware(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const pathname = request.nextUrl.pathname

  const session = cookieHeader ? await readSession(cookieHeader) : null
  const user = session?.user ?? null

  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isProfileRoute = pathname.startsWith('/profile')
  const isLoginRoute = pathname.startsWith('/login')

  if (!user && (isDashboardRoute || isProfileRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL(dashboardPathByRole[user.role] ?? '/', request.url))
  }

  if (user && isDashboardRoute) {
    const requiredRole = pathname.split('/')[2]

    if (requiredRole && requiredRole !== user.role) {
      return NextResponse.redirect(new URL(dashboardPathByRole[user.role] ?? '/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/profile', '/dashboard/:path*'],
}