import { NextResponse } from 'next/server'

// Exposes public Supabase config at runtime so the client bundle can
// initialize even when NEXT_PUBLIC_* vars weren't baked in at build time.
// The anon key is intentionally public (it's the "anon" key by design).
export function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  })
}
