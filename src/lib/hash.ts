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

export function hashEmail(email: string): string {
  return createHash('sha256')
    .update(email.trim().toLowerCase() + pepper())
    .digest('hex')
}
