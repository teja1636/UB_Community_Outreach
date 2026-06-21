import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { hashPhone } from '@/lib/hash'
import { generatePseudonym, DEFAULT_AVATAR } from '@/lib/constants'

// POST /api/user/ensure
// Called right after a successful phone-OTP verification. Creates the user's
// row on first login (generated pseudonym, default avatar, phone_hash), after
// checking the blocked list. Idempotent: returns the existing row on re-login.
export async function POST() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }
  if (!authUser.phone) {
    return NextResponse.json({ error: 'no_phone_on_session' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const phone_hash = hashPhone(authUser.phone)

  // 1. Ban enforcement — refuse signup if this phone is on the blocked list.
  const { data: blocked } = await admin
    .from('blocked_identifiers')
    .select('id')
    .eq('hash', phone_hash)
    .eq('hash_type', 'phone')
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

  // 3. One phone = one account. If a row already exists for this phone hash
  //    (e.g. re-login on a new auth session), reclaim it rather than duplicate.
  const { data: existingByPhone } = await admin
    .from('users')
    .select('*')
    .eq('phone_hash', phone_hash)
    .maybeSingle()

  if (existingByPhone) {
    const { data: relinked } = await admin
      .from('users')
      .update({ auth_id: authUser.id })
      .eq('id', existingByPhone.id)
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
      phone_hash,
      is_anonymous: true,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: created, needs_onboarding: true })
}
