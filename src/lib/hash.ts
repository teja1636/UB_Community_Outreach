import { createHash } from 'crypto'

// One-way hashes for Sybil defense. We NEVER store the raw phone number or
// email — only sha256(value + server pepper). The pepper is a server-only
// secret so the hashes cannot be brute-forced from a leaked table alone.
//
// SERVER-ONLY: importing `crypto` and reading HASH_PEPPER must never happen
// in client code.

function pepper(): string {
  const p = process.env.HASH_PEPPER
  if (!p || p === 'change_me_to_a_long_random_string') {
    throw new Error('HASH_PEPPER is not set to a real secret')
  }
  return p
}

// Normalize a phone to E.164-ish digits so the same number always hashes the
// same way regardless of formatting.
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits.startsWith('+') ? digits : `+${digits}`
}

export function hashPhone(phone: string): string {
  return createHash('sha256')
    .update(normalizePhone(phone) + pepper())
    .digest('hex')
}

// Normalize an email so the same real inbox always produces the same hash,
// even if someone uses Gmail dots or +subaddresses to fake multiple accounts.
export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase()
  const at = lower.indexOf('@')
  if (at === -1) return lower
  let local = lower.slice(0, at)
  const domain = lower.slice(at + 1)
  // Strip +subaddress (works for any provider)
  local = local.split('+')[0]
  // Gmail and Googlemail ignore dots in the local part
  const normalDomain = domain === 'googlemail.com' ? 'gmail.com' : domain
  if (normalDomain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${normalDomain}`
}

export function hashEmail(email: string): string {
  return createHash('sha256')
    .update(normalizeEmail(email) + pepper())
    .digest('hex')
}
