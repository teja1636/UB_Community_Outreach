import { ShieldCheck, EyeOff, Sparkles, Check } from 'lucide-react'
import type { UserRow } from '@/lib/types'
import { trustTags, timeAgo, type TrustTag } from '@/lib/trust'

const ICONS = { shield: ShieldCheck, 'eye-off': EyeOff, sparkle: Sparkles, check: Check }
const VARIANT_CLASS = {
  green: 'text-[#027A48]',
  blue: 'text-ub-blue',
  amber: 'text-[#B54708]',
  gray: 'text-gray-400',
}

// Inline trust line shown under a pseudonym on cards: the primary tag + time.
export default function TrustBadge({ user, createdAt }: { user: UserRow; createdAt?: string }) {
  const tags = trustTags(user)
  const primary: TrustTag = tags[0] ?? { label: 'anonymous', variant: 'gray', icon: 'eye-off' }
  const Icon = ICONS[primary.icon]
  return (
    <span className={`flex items-center gap-1 text-[11px] ${VARIANT_CLASS[primary.variant]}`}>
      <Icon size={11} />
      {primary.label}
      {createdAt ? ` · ${timeAgo(createdAt)}` : ''}
    </span>
  )
}

// Full chip row of all trust tags — used on the profile screen.
export function TrustTagChips({ user }: { user: UserRow }) {
  const tags = trustTags(user)
  const CHIP_CLASS = {
    green: 'chip-green',
    blue: 'chip-blue',
    amber: 'chip-amber',
    gray: '',
  }
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {tags.map((t) => {
        const Icon = ICONS[t.icon]
        return (
          <span key={t.label} className={`chip ${CHIP_CLASS[t.variant]}`}>
            <Icon size={11} /> {t.label}
          </span>
        )
      })}
    </div>
  )
}
