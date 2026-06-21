'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Footprints, Bike, Info, Star, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { placeFoodOrder } from '@/lib/orders'
import type { PostRow } from '@/lib/types'
import ScreenHeader from '@/components/ui/ScreenHeader'

export default function FoodOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const [post, setPost] = useState<PostRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('posts')
      .select('*, users(*), food_listings(*)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as PostRow | null
        setPost(p)
        const f = p?.food_listings?.[0]
        if (f && !f.pickup_available && f.delivery_available) setFulfillment('delivery')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div>
        <ScreenHeader title="Order food" />
        <div className="p-4">
          <div className="skeleton h-36 w-full rounded-xl mb-3" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
    )
  }

  const food = post?.food_listings?.[0]
  if (!post || !food) {
    return (
      <div>
        <ScreenHeader title="Order food" />
        <div className="p-8 text-center text-sm text-gray-400">This listing is no longer available.</div>
      </div>
    )
  }

  const seller = post.users
  const deliveryFee = food.delivery_fee ?? 0
  const total = food.price + (fulfillment === 'delivery' ? deliveryFee : 0)
  const soldOut = food.quantity_remaining <= 0
  const isOwn = me?.id === post.user_id

  async function place() {
    if (!me || !post || !food) return
    setError('')
    setPlacing(true)
    try {
      const paymentMethod = seller?.venmo_handle ? 'venmo' : seller?.cashapp_handle ? 'cashapp' : 'cash'
      const orderId = await placeFoodOrder({
        buyerId: me.id,
        post,
        food,
        fulfillment,
        paymentMethod,
      })
      router.replace(`/orders/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place order')
      setPlacing(false)
    }
  }

  return (
    <div>
      <ScreenHeader title="Order food" />
      <div className="p-4">
        <div className="h-36 bg-gray-50 rounded-xl flex items-center justify-center mb-3 text-5xl opacity-20">
          🍱
        </div>
        <div className="text-base font-medium">{post.title}</div>
        <div className="text-sm text-gray-500 mt-0.5 mb-1 flex items-center gap-1">
          by {seller?.display_name} ·
          <Star size={12} className="text-amber-400 fill-amber-400" />
          {seller?.rating?.toFixed(1)}
        </div>
        {post.description && <p className="text-sm text-gray-500 mb-3">{post.description}</p>}

        <div className="text-sm font-medium mb-2">Fulfillment</div>
        <div className="flex gap-2 mb-4">
          {food.pickup_available && (
            <button
              onClick={() => setFulfillment('pickup')}
              className={`flex-1 p-3 rounded-xl border text-center ${
                fulfillment === 'pickup' ? 'border-ub-blue border-2' : 'border-gray-200'
              }`}
            >
              <Footprints size={20} className="mx-auto text-ub-blue" />
              <div className="text-sm font-medium mt-1">Pickup</div>
              <div className="text-xs text-gray-400">${food.price.toFixed(2)}</div>
            </button>
          )}
          {food.delivery_available && (
            <button
              onClick={() => setFulfillment('delivery')}
              className={`flex-1 p-3 rounded-xl border text-center ${
                fulfillment === 'delivery' ? 'border-ub-blue border-2' : 'border-gray-200'
              }`}
            >
              <Bike size={20} className="mx-auto text-gray-500" />
              <div className="text-sm font-medium mt-1">Delivery</div>
              <div className="text-xs text-gray-400">
                ${food.price.toFixed(2)} + ${deliveryFee.toFixed(2)}
              </div>
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-gray-500">Food</span>
            <span className="text-sm font-medium">${food.price.toFixed(2)}</span>
          </div>
          {fulfillment === 'delivery' && (
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-gray-500">Delivery</span>
              <span className="text-sm font-medium">${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 my-2" />
          <div className="flex justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-base font-semibold text-ub-blue">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center mb-3 flex items-center justify-center gap-1">
          <Info size={12} /> Pay seller{fulfillment === 'delivery' ? ' + rider' : ''} directly
          {seller?.venmo_handle ? ` (Venmo @${seller.venmo_handle})` : ''}. Platform just tracks it.
        </div>

        {error && <div className="text-xs text-red-500 text-center mb-2">{error}</div>}

        <button
          className="btn btn-primary w-full py-3"
          onClick={place}
          disabled={placing || soldOut || isOwn}
        >
          {placing && <Loader2 size={16} className="animate-spin" />}
          {isOwn ? 'This is your listing' : soldOut ? 'Sold out' : 'Place order'}
        </button>
      </div>
    </div>
  )
}
