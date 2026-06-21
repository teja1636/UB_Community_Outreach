'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Star, Bike, Footprints } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PostRow } from '@/lib/types'
import BottomNav from '@/components/ui/BottomNav'
import Avatar from '@/components/ui/Avatar'
import PostComposer from '@/components/feed/PostComposer'

const FILTERS = ['All', 'Pickup', 'Delivery', 'halal', 'vegan']

export default function FoodPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [showComposer, setShowComposer] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, users(*), food_listings(*)')
      .eq('type', 'food')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setPosts((data as PostRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const filtered = posts.filter((p) => {
    const f = p.food_listings?.[0]
    if (!f) return false
    if (filter === 'Pickup') return f.pickup_available
    if (filter === 'Delivery') return f.delivery_available
    if (filter === 'halal' || filter === 'vegan') return f.dietary_tags?.includes(filter)
    return true
  })

  return (
    <div className="with-bottom-nav">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Food</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowComposer(true)}>
            <Plus size={14} /> List
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                filter === f ? 'bg-ub-blue text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="card">
            <div className="skeleton h-28 w-full rounded-xl mb-3" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🍽️</div>
            <div className="font-medium text-gray-700 mb-1">No food listed yet</div>
            <div className="text-sm text-gray-400">Be the first — tap List</div>
          </div>
        ) : (
          filtered.map((p) => {
            const f = p.food_listings![0]
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/food/${p.id}`)}
                className="card mb-3 w-full text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.users} size={36} />
                    <div>
                      <div className="text-sm font-medium">{p.users?.display_name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        {p.users?.rating?.toFixed(1)} · {p.users?.total_orders ?? 0} orders
                      </div>
                    </div>
                  </div>
                  <span className="chip chip-green">{f.quantity_remaining} left</span>
                </div>
                <div className="h-28 bg-gray-50 rounded-xl flex items-center justify-center mb-2 text-3xl opacity-20">
                  🍱
                </div>
                <div className="text-sm font-medium">{p.title}</div>
                {p.location_label && (
                  <div className="text-xs text-gray-400 mt-0.5 mb-2">{p.location_label}</div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">${f.price.toFixed(2)}</span>
                  <div className="flex gap-1.5">
                    {f.pickup_available && (
                      <span className="chip">
                        <Footprints size={11} /> Pickup
                      </span>
                    )}
                    {f.delivery_available && (
                      <span className="chip">
                        <Bike size={11} /> Delivery
                      </span>
                    )}
                  </div>
                </div>
              </button>
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
