import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = { name: string; value: string; options: CookieOptions }

// Public routes that don't require a session.
const PUBLIC_PREFIXES = ['/welcome', '/api/auth']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getSession() reads the cookie locally — no network call, safe on Edge Runtime.
  // Individual server components call getUser() to fully validate the JWT.
  let user = null
  try {
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
  } catch {
    // Treat as unauthenticated; the page will redirect to /welcome.
  }

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
