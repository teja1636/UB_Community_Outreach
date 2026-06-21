'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Home, MapPin, Navigation, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ZONES } from '@/lib/constants'
import type { LocationZone } from '@/lib/types'

const ICONS = { north_campus: Building2, south_campus: Home, off_campus: MapPin }

export default function LocationStep() {
  const router = useRouter()
  const { user, refresh } = useAuth()
  const [saving, setSaving] = useState<LocationZone | null>(null)

  async function pick(zone: LocationZone) {
    if (!user) return
    setSaving(zone)
    await supabase.from('users').update({ location_zone: zone }).eq('id', user.id)
    await refresh()
    router.push('/onboarding/identity')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="text-center py-3 border-b border-gray-100 text-sm font-medium">
        Your campus zone
      </div>
      <div className="flex-1 px-4 py-5 flex flex-col gap-3">
        <p className="text-sm text-gray-500 text-center">
          Helps show nearby food, rides and sales. We store the zone only — never your exact
          address.
        </p>
        <button
          className="btn btn-primary w-full py-3"
          onClick={() => pick('north_campus')}
          disabled={!!saving}
        >
          <Navigation size={16} /> Use my location
        </button>
        <div className="text-xs text-gray-400 text-center">or pick manually</div>
        {ZONES.map((z) => {
          const Icon = ICONS[z.key]
          return (
            <button
              key={z.key}
              onClick={() => pick(z.key)}
              disabled={!!saving}
              className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl text-left hover:border-ub-blue transition-colors disabled:opacity-60"
            >
              {saving === z.key ? (
                <Loader2 size={20} className="text-ub-blue animate-spin" />
              ) : (
                <Icon size={20} className="text-gray-500" />
              )}
              <div>
                <div className="text-sm font-medium">{z.label}</div>
                <div className="text-xs text-gray-400">{z.sub}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
