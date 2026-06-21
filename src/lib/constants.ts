import type { LocationZone } from './types'

// Animal-emoji avatars — the one intentional use of emoji in the product.
export const AVATARS = ['🐃', '🦉', '🦊', '🐺', '🦅'] as const
export const DEFAULT_AVATAR = '🐃'

export const ZONES: { key: LocationZone; label: string; sub: string }[] = [
  { key: 'north_campus', label: 'North campus', sub: 'Main academic area' },
  { key: 'south_campus', label: 'South campus', sub: 'Medical, residential' },
  { key: 'off_campus', label: 'Off campus', sub: 'Amherst, Buffalo' },
]

export const ZONE_LABELS: Record<LocationZone, string> = {
  north_campus: 'North campus',
  south_campus: 'South campus',
  off_campus: 'Off campus',
}

export const PRIORITIES = [
  { key: 'rides', label: 'Find or offer rides', sub: 'Get around campus & town' },
  { key: 'sell_food', label: 'Sell or buy food', sub: 'Homemade meals on campus' },
  { key: 'browse', label: 'Just browsing', sub: 'Not sure yet, show me around' },
] as const

export const DIETARY_TAGS = ['halal', 'vegan', 'vegetarian', 'gluten-free', 'nut-free'] as const

export const SALE_CATEGORIES = [
  'furniture',
  'electronics',
  'books',
  'kitchen',
  'clothing',
] as const

// A pseudonym like "Buffalo #4821". Random 4-digit suffix keeps it friendly.
export function generatePseudonym(): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `Buffalo #${n}`
}

// Earned-tag thresholds (kept here so UI and logic agree).
export const TRUST_THRESHOLDS = {
  trusted_seller: { orders: 10, rating: 4.5 },
  top_rider: { rides: 10, rating: 4.5 },
}
