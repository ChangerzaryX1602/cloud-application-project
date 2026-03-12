import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/callback']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('platform_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check expiry
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (Date.now() >= payload.exp * 1000) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('platform_token')
      return response
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
