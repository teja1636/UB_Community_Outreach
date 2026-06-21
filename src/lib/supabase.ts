'use client'
import { createBrowserClient } from '@supabase/ssr'

// Browser Supabase client. Uses cookie storage (via @supabase/ssr) so the
// session is shared with the Next.js middleware and server routes.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Re-export shared types so existing `@/lib/supabase` imports keep working.
export * from './types'
