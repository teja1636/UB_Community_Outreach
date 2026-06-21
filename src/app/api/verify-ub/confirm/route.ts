import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// POST /api/verify-ub/confirm  { code }
// Confirms the 6-digit code and flips the user to UB verified, storing only
// the email hash.
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { code } = await req.json()
  const admin = createSupabaseAdminClient()

  const { data: me } = await admin
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single()
  if (!me) return NextResponse.json({ error: 'no_user' }, { status: 400 })

  const { data: v } = await admin
    .from('ub_verifications')
    .select('*')
    .eq('user_id', me.id)
    .maybeSingle()

  if (!v || v.code !== String(code).trim()) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }
  if (new Date(v.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'code_expired' }, { status: 400 })
  }

  // Double-check uniqueness in case someone verified the same email meanwhile.
  const { data: clash } = await admin
    .from('users')
    .select('id')
    .eq('ub_email_hash', v.email_hash)
    .neq('id', me.id)
    .maybeSingle()
  if (clash) return NextResponse.json({ error: 'email_already_verified' }, { status: 409 })

  await admin
    .from('users')
    .update({ is_ub_verified: true, ub_email_hash: v.email_hash })
    .eq('id', me.id)
  await admin.from('ub_verifications').delete().eq('user_id', me.id)

  return NextResponse.json({ verified: true })
}
