import { NextResponse, type NextRequest } from 'next/server'

// Public routes that don't require a session.
const PUBLIC_PREFIXES = ['/welcome', '/api/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Supabase @supabase/ssr stores the session as sb-<project_ref>-auth-token.
  // Checking the cookie directly avoids importing @supabase/ssr in the Edge
  // Runtime, which can cause MIDDLEWARE_INVOCATION_FAILED on Vercel.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
