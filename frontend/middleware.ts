import { NextRequest, NextResponse } from 'next/server'

// Routing hint only (see lib/auth.ts setSessionHint). It says "this browser has
// signed in" and nothing else: no role, so it cannot be read or edited to reach
// another dashboard. Role routing happens client-side from the verified session
// (app/dashboard/layout-wrapper.tsx, app/dashboard/page.tsx, app/profile/page.tsx).
const hasSessionHint = (request: NextRequest) =>
  request.cookies.get('signedIn')?.value === '1' ||
  // Sessions from before the hint dropped the role; AuthProvider migrates them
  Boolean(request.cookies.get('userRole')?.value)

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const signedIn = hasSessionHint(request)

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/profile')

  if (!signedIn && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // app/dashboard/page.tsx forwards to the account's own dashboard
  if (signedIn && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/profile', '/dashboard/:path*'],
}
