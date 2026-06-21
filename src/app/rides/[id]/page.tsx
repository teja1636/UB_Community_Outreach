'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, Clock, Users, Info, Loader2, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { bookRideSeat } from '@/lib/orders'
import type { PostRow } from '@/lib/types'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Avatar from '@/components/ui/Avatar'

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const [post, setPost] = useState<PostRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('posts')
      .select('*, users(*), ride_listings(*)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setPost(data as PostRow | null)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div>
        <ScreenHeader title="Book a ride" />
        <div className="p-4">
          <div className="skeleton h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const ride = post?.ride_listings?.[0]
  if (!post || !ride) {
    return (
      <div>
        <ScreenHeader title="Book a ride" />
        <div className="p-8 text-center text-sm text-gray-400">This ride is no longer available.</div>
      </div>
    )
  }

  const driver = post.users
  const soldOut = ride.seats_remaining <= 0
  const isOwn = me?.id === post.user_id

  async function book() {
    if (!me || !post || !ride) return
    setError('')
    setBooking(true)
    try {
      const paymentMethod = driver?.venmo_handle ? 'venmo' : driver?.cashapp_handle ? 'cashapp' : 'cash'
      const orderId = await bookRideSeat({
        buyerId: me.id,
        post,
        sellerId: post.user_id,
        pricePerSeat: ride.price_per_seat,
        seatsRemaining: ride.seats_remaining,
        rideListingId: ride.id,
        paymentMethod,
      })
      router.replace(`/orders/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not book seat')
      setBooking(false)
    }
  }

  return (
    <div>
      <ScreenHeader title="Book a ride" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar user={driver} size={44} />
          <div>
            <div className="text-sm font-medium">{driver?.display_name}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              {driver?.rating?.toFixed(1)} · {driver?.total_rides ?? 0} rides
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-ub-blue" />
            <span className="text-sm">{ride.pickup_label}</span>
          </div>
          <div className="ml-1 border-l-2 border-dashed border-gray-200 h-4" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-sm">{ride.dropoff_label}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="chip">
            <Clock size={12} />{' '}
            {new Date(ride.departure_time).toLocaleString('en-US', {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          <span className="chip">
            <Users size={12} /> {ride.seats_remaining} seats left
          </span>
          {ride.vehicle_description && (
            <span className="chip">
              <MapPin size={12} /> {ride.vehicle_description}
            </span>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Price per seat</span>
          <span className="text-base font-semibold text-ub-blue">
            ${ride.price_per_seat.toFixed(2)}
          </span>
        </div>

        <div className="text-xs text-gray-400 text-center mb-3 flex items-center justify-center gap-1">
          <Info size={12} /> Pay the driver directly
          {driver?.venmo_handle ? ` (Venmo @${driver.venmo_handle})` : ''}. Platform just tracks it.
        </div>

        {error && <div className="text-xs text-red-500 text-center mb-2">{error}</div>}

        <button className="btn btn-primary w-full py-3" onClick={book} disabled={booking || soldOut || isOwn}>
          {booking && <Loader2 size={16} className="animate-spin" />}
          {isOwn ? 'This is your ride' : soldOut ? 'Fully booked' : 'Book a seat'}
        </button>
      </div>
    </div>
  )
}
