import { UtensilsCrossed, Car, Tag, Calendar, MessageSquare } from 'lucide-react'

const TYPE_CONFIG = {
  food:      { label: 'Food',      icon: UtensilsCrossed, cls: 'type-food'      },
  ride:      { label: 'Ride',      icon: Car,             cls: 'type-ride'      },
  sale:      { label: 'Sale',      icon: Tag,             cls: 'type-sale'      },
  event:     { label: 'Event',     icon: Calendar,        cls: 'type-event'     },
  community: { label: 'Community', icon: MessageSquare,   cls: 'type-community' },
}

type PostType = keyof typeof TYPE_CONFIG

export default function TypeTag({ type }: { type: PostType }) {
  const { label, icon: Icon, cls } = TYPE_CONFIG[type] ?? TYPE_CONFIG.community
  return (
    <span className={`chip ${cls}`} style={{ fontSize: 11 }}>
      <Icon size={11} />
      {label}
    </span>
  )
}
