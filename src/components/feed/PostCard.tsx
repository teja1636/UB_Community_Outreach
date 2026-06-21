'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, MapPin, Clock, Users, Coins } from 'lucide-react'
import type { PostRow } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { displayName } from '@/lib/trust'
import Avatar from '@/components/ui/Avatar'
import TrustBadge from '@/components/ui/TrustBadge'
import TypeTag from '@/components/ui/TypeTag'

export default function PostCard({ post, liked = false }: { post: PostRow; liked?: boolean }) {
  const router = useRouter()
  const { user: me } = useAuth()
  const [isLiked, setIsLiked] = useState(liked)
  const [likeCount, setLikeCount] = useState(post.like_count)

  const user = post.users
  const food = post.food_listings?.[0]
  const ride = post.ride_listings?.[0]
  const sale = post.sale_listings?.[0]

  async function toggleLike() {
    if (!me) return
    const next = !isLiked
    setIsLiked(next)
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    if (next) {
      await supabase.from('likes').insert({ user_id: me.id, post_id: post.id })
    } else {
      await supabase.from('likes').delete().eq('user_id', me.id).eq('post_id', post.id)
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="card mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar user={user} size={36} />
          <div>
            <div className="text-sm font-medium">{user ? displayName(user) : 'Unknown'}</div>
            {user && <TrustBadge user={user} createdAt={post.created_at} />}
          </div>
        </div>
        <TypeTag type={post.type} />
      </div>

      {/* Image */}
      {post.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-44 object-cover rounded-xl mb-3"
        />
      ) : post.type === 'food' || post.type === 'community' || post.type === 'event' ? (
        <div className="w-full h-44 bg-gray-50 rounded-xl mb-3 flex items-center justify-center">
          <span className="text-4xl opacity-20">
            {post.type === 'food' ? '🍱' : post.type === 'event' ? '🎉' : '📸'}
          </span>
        </div>
      ) : null}

      <div className="font-medium text-sm mb-1">{post.title}</div>
      {post.description && (
        <div className="text-xs text-gray-500 mb-2 leading-relaxed">{post.description}</div>
      )}
      {post.location_label && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
          <MapPin size={11} />
          {post.location_label}
        </div>
      )}

      {/* FOOD */}
      {food && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1 mb-3">
            {food.pickup_available && <span className="chip">Pickup</span>}
            {food.delivery_available && (
              <span className="chip">Delivery +${(food.delivery_fee ?? 0).toFixed(2)}</span>
            )}
            {food.dietary_tags?.map((t) => (
              <span key={t} className="chip chip-green">
                {t}
              </span>
            ))}
            <span className="chip">{food.quantity_remaining} left</span>
          </div>
          {food.available_until && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <Clock size={11} />
              Ready until {formatTime(food.available_until)}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">${food.price.toFixed(2)}</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push(`/food/${post.id}`)}
            >
              Order
            </button>
          </div>
        </div>
      )}

      {/* RIDE */}
      {ride && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-xs mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-gray-700">{ride.pickup_label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs mb-2">
            <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            <span className="text-gray-700">{ride.dropoff_label}</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="chip">
              <Clock size={10} /> {formatTime(ride.departure_time)}
            </span>
            <span className="chip">
              <Users size={10} /> {ride.seats_remaining} seats
            </span>
            {ride.vehicle_description && <span className="chip">{ride.vehicle_description}</span>}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-base">${ride.price_per_seat.toFixed(2)}</span>
              <span className="text-xs text-gray-400"> /seat</span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push(`/rides/${post.id}`)}
            >
              Book seat
            </button>
          </div>
        </div>
      )}

      {/* SALE */}
      {sale && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1 mb-3">
            {sale.condition && <span className="chip">{sale.condition.replace('_', ' ')}</span>}
            {sale.category && <span className="chip">{sale.category}</span>}
            {sale.pickup_label && (
              <span className="chip">
                <MapPin size={10} /> {sale.pickup_label}
              </span>
            )}
          </div>
          {sale.is_accommodation && (
            <div className="text-[11px] text-[#B54708] bg-[#FFFAEB] rounded-lg px-2.5 py-1.5 mb-3">
              Info only · arrange lease directly
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">
              {sale.is_accommodation && sale.lease_price_monthly != null
                ? `$${sale.lease_price_monthly.toFixed(0)}/mo`
                : sale.price != null
                  ? `$${sale.price.toFixed(2)}`
                  : '—'}
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push(`/sales/${post.id}`)}
            >
              {sale.is_accommodation ? 'Message' : 'Buy'}
            </button>
          </div>
        </div>
      )}

      {/* COMMUNITY / EVENT reactions */}
      {(post.type === 'community' || post.type === 'event') && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <button
            className={`flex items-center gap-1 text-sm ${isLiked ? 'text-red-500' : 'text-gray-400'}`}
            onClick={toggleLike}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            {likeCount}
          </button>
          <button className="flex items-center gap-1 text-sm text-gray-400">
            <MessageCircle size={16} /> Comment
          </button>
          <button className="flex items-center gap-1 text-sm text-gray-400">
            <Coins size={16} /> Tip
          </button>
        </div>
      )}
    </div>
  )
}
