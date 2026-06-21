'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, UtensilsCrossed, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { PRIORITIES } from '@/lib/constants'

const ICONS = { rides: Car, sell_food: UtensilsCrossed, browse: Eye }
const COLORS = { rides: 'text-[#175CD3]', sell_food: 'text-[#B54708]', browse: 'text-gray-500' }

export default function PrioritiesStep() {
  const router = useRouter()
  const { user, refresh } = useAuth()
  const [saving, setSaving] = useState(false)

  async function choose(key: string) {
    if (!user) return
    setSaving(true)
    await supabase.from('users').update({ priorities: [key] }).eq('id', user.id)
    await refresh()
    router.replace('/feed')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100">
        <span className="text-sm font-medium">What brings you here?</span>
        <button className="text-xs text-gray-400" onClick={() => router.replace('/feed')}>
          Skip
        </button>
      </div>
      <div className="flex-1 px-4 py-5 flex flex-col gap-2.5">
        <p className="text-sm text-gray-500 text-center mb-1.5">
          We&apos;ll tailor your feed. You can do everything regardless.
        </p>
        {PRIORITIES.map((p) => {
          const Icon = ICONS[p.key]
          return (
            <button
              key={p.key}
              onClick={() => choose(p.key)}
              disabled={saving}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl text-left hover:border-ub-blue transition-colors disabled:opacity-60"
            >
              <Icon size={22} className={COLORS[p.key]} />
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-gray-400">{p.sub}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
