'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Start with whatever is baked into the bundle at build time.
// When env vars weren't set at build time these are placeholder strings —
// initSupabase() will replace the client with a real one fetched from /api/config.
let _client = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
)

let _ready = false
let _pending: Promise<void> | null = null

function looksReal(v: string | undefined): boolean {
  return !!v && !v.includes('placeholder') && !v.includes('YOUR_')
}

// Call once before any Supabase operation. Idempotent.
// If build-time env vars are correct it resolves instantly.
// Otherwise it fetches /api/config (reads runtime env vars on the server)
// and re-creates the client with the real URL + key.
export async function initSupabase(): Promise<void> {
  if (_ready) return
  if (_pending) return _pending

  const builtUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const builtKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (looksReal(builtUrl) && looksReal(builtKey)) {
    _ready = true
    return
  }

  _pending = fetch('/api/config')
    .then((r) => r.json())
    .then(({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) => {
      if (looksReal(supabaseUrl) && looksReal(supabaseAnonKey)) {
        _client = createBrowserClient(supabaseUrl, supabaseAnonKey)
      }
      _ready = true
    })
    .catch(() => {
      _ready = true // stop retrying; calls will fail naturally
    })

  return _pending
}

// Transparent Proxy — every property access is forwarded to the current _client.
// When initSupabase() replaces _client the proxy automatically uses the new one,
// so all 20+ files that import `supabase` get the real client without changes.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return Reflect.get(_client, prop, _client)
  },
})

export * from './types'
