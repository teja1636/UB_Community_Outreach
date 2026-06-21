'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UtensilsCrossed, Car, Tag, Wallet } from 'lucide-react'

const NAV = [
  { href: '/feed',   icon: Home,            label: 'Feed'   },
  { href: '/food',   icon: UtensilsCrossed, label: 'Food'   },
  { href: '/rides',  icon: Car,             label: 'Rides'  },
  { href: '/sales',  icon: Tag,             label: 'Sales'  },
  { href: '/wallet', icon: Wallet,          label: 'Wallet' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`nav-btn ${pathname.startsWith(href) ? 'active' : ''}`}
        >
          <Icon size={22} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
