'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Map, Star, Clock, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PostRow } from '@/lib/types'
import BottomNav from '@/components/ui/BottomNav'
import Avatar from '@/components/ui/Avatar'
import PostComposer from '@/components/feed/PostComposer'

export default function RidesPage() {
  const router = useRouter()
  const [rides, setRides] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [showComposer, setShowComposer] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, users(*), ride_listings(*)')
      .eq('type', 'ride')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setRides((data as PostRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  function findDrivers() {
    const params = new URLSearchParams()
    if (pickup) params.set('from', pickup)
    if (dropoff) params.set('to', dropoff)
    router.push(`/rides/instant?${params.toString()}`)
  }

  function formatTime(s: string) {
    return new Date(s).toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="with-bottom-nav">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">Rides</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowComposer(true)}>
          <Plus size={14} /> Offer a ride
        </button>
      </div>

      {/* Instant request */}
      <div className="m-4 bg-gray-50 rounded-xl p-3">
        <div className="text-sm font-medium mb-2">Request a ride now</div>
        <div className="bg-white rounded-lg p-2.5 mb-1.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-ub-blue" />
          <input
            className="text-sm outline-none flex-1 bg-transparent"
            placeholder="Pickup location…"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
          />
        </div>
        <div className="bg-white rounded-lg p-2.5 mb-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <input
            className="text-sm outline-none flex-1 bg-transparent"
            placeholder="Dropoff location…"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-full py-2.5" onClick={findDrivers}>
          <Map size={16} /> Find drivers nearby
        </button>
      </div>

      <div className="text-sm font-medium px-4 pb-2">Scheduled rides</div>
      <div className="px-4">
        {loading ? (
          <div className="card">
            <div className="skeleton h-4 w-2/3 rounded mb-2" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🚗</div>
            <div className="font-medium text-gray-700 mb-1">No scheduled rides</div>
            <div className="text-sm text-gray-400">Offer one, or request a ride now</div>
          </div>
        ) : (
          rides.map((p) => {
            const r = p.ride_listings?.[0]
            if (!r) return null
            return (
              <div key={p.id} className="card mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.users} size={36} />
                    <div>
                      <div className="text-sm font-medium">{p.users?.display_name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        {p.users?.rating?.toFixed(1)} · {p.users?.total_rides ?? 0} rides
                      </div>
                    </div>
                  </div>
                  <span className="chip chip-green">{r.seats_remaining} seats</span>
                </div>
                <div className="text-sm font-medium">
                  {r.pickup_label} → {r.dropoff_label}
                </div>
                <div className="text-xs text-gray-400 mt-1 mb-2 flex items-center gap-1">
                  <Clock size={11} /> {formatTime(r.departure_time)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">${r.price_per_seat.toFixed(2)}/seat</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => router.push(`/rides/${p.id}`)}
                  >
                    Book
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showComposer && (
        <PostComposer onClose={() => setShowComposer(false)} onPosted={() => { setShowComposer(false); load() }} />
      )}
      <BottomNav />
    </div>
  )
}
