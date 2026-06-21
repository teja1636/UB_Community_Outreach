'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Star, Circle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { sendMessage } from '@/lib/messages'
import type { UserRow } from '@/lib/types'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Avatar from '@/components/ui/Avatar'

// Fixed pin positions on the faux map for up to 4 drivers.
const PINS = [
  { top: 35, left: 60 },
  { top: 95, left: 175 },
  { top: 140, left: 85 },
  { top: 65, left: 250 },
]

function InstantInner() {
  const params = useSearchParams()
  const router = useRouter()
  const { user: me } = useAuth()
  const from = params.get('from') ?? 'your pickup'
  const to = params.get('to') ?? 'your dropoff'

  const [drivers, setDrivers] = useState<UserRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    // Surface candidate drivers — students who signalled interest in rides,
    // ranked by ride history. (Live presence is a future enhancement.)
    supabase
      .from('users')
      .select('*')
      .order('total_rides', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        const list = ((data as UserRow[]) ?? []).filter((u) => u.id !== me?.id).slice(0, 4)
        setDrivers(list)
        if (list[0]) setSelected(list[0].id)
        setLoading(false)
      })
  }, [me?.id])

  const chosen = drivers.find((d) => d.id === selected)

  async function request() {
    if (!me || !chosen) return
    setRequesting(true)
    try {
      await sendMessage({
        senderId: me.id,
        receiverId: chosen.id,
        content: `🚗 Ride request: ${from} → ${to}. Are you available?`,
      })
      router.replace(`/messages/${chosen.id}`)
    } catch {
      setRequesting(false)
    }
  }

  return (
    <div>
      <ScreenHeader title="Pick a driver" />
      {loading ? (
        <div className="p-4">
          <div className="skeleton h-52 w-full rounded-xl" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">No drivers nearby right now.</div>
      ) : (
        <>
          {/* Faux map */}
          <div className="relative h-52 bg-gray-100 overflow-hidden">
            <div className="absolute left-0 right-0 top-[60px] h-px bg-gray-200" />
            <div className="absolute left-0 right-0 top-[130px] h-px bg-gray-200" />
            <div className="absolute top-0 bottom-0 left-[110px] w-px bg-gray-200" />
            <div className="absolute top-0 bottom-0 left-[230px] w-px bg-gray-200" />
            {drivers.map((d, i) => {
              const pin = PINS[i]
              const isSel = d.id === selected
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 ${
                    isSel ? 'bg-[#FFFAEB] border-[#EF9F27]' : 'bg-white border-ub-blue'
                  }`}
                  style={{ top: pin.top, left: pin.left }}
                >
                  {d.avatar_emoji}
                </button>
              )
            })}
            <div className="absolute bottom-2 left-2 bg-white rounded-md px-2 py-1 text-[11px] text-gray-500 flex items-center gap-1">
              <Circle size={8} className="fill-[#027A48] text-[#027A48]" /> {drivers.length} drivers
              nearby
            </div>
          </div>

          {chosen && (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar user={chosen} size={40} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{chosen.display_name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    {chosen.rating?.toFixed(1)} · {chosen.total_rides ?? 0} rides
                  </div>
                </div>
              </div>
              <button className="btn btn-primary w-full py-3" onClick={request} disabled={requesting}>
                {requesting && <Loader2 size={15} className="animate-spin" />} Request this driver
              </button>
              <div className="text-xs text-gray-400 text-center mt-2">
                Only this driver is notified · 90s to accept
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function InstantRidePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading…</div>}>
      <InstantInner />
    </Suspense>
  )
}
