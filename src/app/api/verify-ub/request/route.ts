import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { hashEmail } from '@/lib/hash'

// POST /api/verify-ub/request  { email }
// Sends a 6-digit code to an @buffalo.edu address. We store only the email
// hash. One verified account per student is enforced at confirm time.
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { email } = await req.json()
  if (typeof email !== 'string' || !/^[^@\s]+@buffalo\.edu$/i.test(email.trim())) {
    return NextResponse.json({ error: 'not_a_buffalo_email' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const email_hash = hashEmail(email)

  // One verified account per @buffalo.edu address.
  const { data: existing } = await admin
    .from('users')
    .select('auth_id')
    .eq('ub_email_hash', email_hash)
    .maybeSingle()
  if (existing && existing.auth_id !== authUser.id) {
    return NextResponse.json({ error: 'email_already_verified' }, { status: 409 })
  }

  const { data: me } = await admin
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single()
  if (!me) return NextResponse.json({ error: 'no_user' }, { status: 400 })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await admin.from('ub_verifications').upsert({
    user_id: me.id,
    email_hash,
    code,
    expires_at,
  })

  // TODO: deliver `code` to `email` via a Supabase Edge Function / SMTP.
  // Until an email provider is configured, return the code in development so
  // the flow is testable. This is intentionally disabled in production.
  const devCode = process.env.NODE_ENV !== 'production' ? code : undefined
  return NextResponse.json({ sent: true, devCode })
}
