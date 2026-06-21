import type { UserRow } from './types'

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  return `${w}w`
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export function isNewMember(user: Pick<UserRow, 'created_at'>): boolean {
  return Date.now() - new Date(user.created_at).getTime() < SEVEN_DAYS
}

export type TrustTag = {
  label: string
  // maps to a chip variant class in globals.css
  variant: 'green' | 'blue' | 'amber' | 'gray'
  icon: 'shield' | 'eye-off' | 'sparkle' | 'check'
}

const EARNED_LABELS: Record<string, string> = {
  trusted_seller: 'trusted seller',
  top_rider: 'top rider',
  quick_replier: 'quick replier',
}

// The ordered set of tags to show next to a pseudonym.
export function trustTags(user: UserRow): TrustTag[] {
  const tags: TrustTag[] = []
  if (user.is_ub_verified) {
    tags.push({ label: 'UB verified', variant: 'green', icon: 'shield' })
  } else if (user.is_anonymous) {
    tags.push({ label: 'anonymous', variant: 'gray', icon: 'eye-off' })
  }
  if (isNewMember(user)) {
    tags.push({ label: 'new member', variant: 'blue', icon: 'sparkle' })
  }
  for (const t of user.earned_tags ?? []) {
    if (EARNED_LABELS[t]) {
      tags.push({ label: EARNED_LABELS[t], variant: 'amber', icon: 'check' })
    }
  }
  return tags
}

export function displayName(user: Pick<UserRow, 'display_name' | 'real_name'>): string {
  return user.real_name || user.display_name
}
