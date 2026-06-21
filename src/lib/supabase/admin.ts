import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client. SERVER-ONLY — never import into a client
// component. Bypasses Row Level Security, so it is used for the few trusted
// operations that the anon role must not be able to do directly: creating a
// user row (with a server-side phone hash) and checking blocked identifiers.
export function createSupabaseAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
