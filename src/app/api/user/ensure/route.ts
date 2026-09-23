import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { hashEmail } from '@/lib/hash'
import { generatePseudonym, DEFAULT_AVATAR } from '@/lib/constants'

// POST /api/user/ensure
// Called right after a successful email-OTP verification. Creates the user's
// row on first login (generated pseudonym, default avatar, phone_hash stored
// as the email hash for Sybil defense). Idempotent: returns existing row on re-login.
export async function POST() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }
  if (!authUser.email) {
    return NextResponse.json({ error: 'no_email_on_session' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const email_hash = hashEmail(authUser.email)

  // 1. Ban enforcement — refuse signup if this email hash is on the blocked list.
  const { data: blocked } = await admin
    .from('blocked_identifiers')
    .select('id')
    .eq('hash', email_hash)
    .eq('hash_type', 'email')
    .maybeSingle()

  if (blocked) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'account_blocked' }, { status: 403 })
  }

  // 2. Already linked to this auth session? Return it.
  const { data: existingByAuth } = await admin
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (existingByAuth) {
    return NextResponse.json({
      user: existingByAuth,
      needs_onboarding: !existingByAuth.location_zone,
    })
  }

  // 3. One email = one account. If a row exists for this email hash
  //    (e.g. re-login on a new auth session), reclaim it.
  const { data: existingByEmail } = await admin
    .from('users')
    .select('*')
    .eq('phone_hash', email_hash)
    .maybeSingle()

  if (existingByEmail) {
    const { data: relinked } = await admin
      .from('users')
      .update({ auth_id: authUser.id })
      .eq('id', existingByEmail.id)
      .select('*')
      .single()
    return NextResponse.json({
      user: relinked,
      needs_onboarding: !relinked?.location_zone,
    })
  }

  // 4. First login — create the row.
  const { data: created, error } = await admin
    .from('users')
    .insert({
      auth_id: authUser.id,
      display_name: generatePseudonym(),
      avatar_emoji: DEFAULT_AVATAR,
      phone_hash: email_hash,
      is_anonymous: true,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: created, needs_onboarding: true })
}
