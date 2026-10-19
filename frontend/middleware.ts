import { NextRequest, NextResponse } from 'next/server'

const dashboardPathByRole: Record<string, string> = {
  admin: '/dashboard/admin',
  lawyer: '/dashboard/lawyer',
  client: '/dashboard/client',
}

// The old /profile page now lives in each dashboard's account section
const accountPathByRole: Record<string, string> = {
  admin: '/dashboard/admin/settings',
  lawyer: '/dashboard/lawyer/profile',
  client: '/dashboard/client/profile',
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

  if (userRole && isProfileRoute) {
    return NextResponse.redirect(new URL(accountPathByRole[userRole], request.url))
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