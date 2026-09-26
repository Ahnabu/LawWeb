import { NextRequest, NextResponse } from 'next/server'

const dashboardPathByRole: Record<string, string> = {
  admin: '/dashboard/admin',
  lawyer: '/dashboard/lawyer',
  client: '/dashboard/client',
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Routing hint only (see lib/auth.ts setRoleCookie); ignore unknown values
  const roleCookie = request.cookies.get('userRole')?.value
  const userRole = roleCookie && roleCookie in dashboardPathByRole ? roleCookie : undefined

  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isProfileRoute = pathname.startsWith('/profile')
  const isLoginRoute = pathname.startsWith('/login')

  if (!userRole && (isDashboardRoute || isProfileRoute)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (userRole && isLoginRoute) {
    return NextResponse.redirect(new URL(dashboardPathByRole[userRole] ?? '/', request.url))
  }

  if (userRole && isDashboardRoute) {
    const requiredRole = pathname.split('/')[2]

    if (requiredRole && requiredRole !== userRole) {
      return NextResponse.redirect(new URL(dashboardPathByRole[userRole] ?? '/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/profile', '/dashboard/:path*'],
}