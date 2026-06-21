'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageCircle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PostRow } from '@/lib/types'
import BottomNav from '@/components/ui/BottomNav'
import Avatar from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/trust'
import PostComposer from '@/components/feed/PostComposer'

const CATS = ['All', 'furniture', 'electronics', 'books', 'kitchen', 'clothing', 'Accommodations']

export default function SalesPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')
  const [showComposer, setShowComposer] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, users(*), sale_listings(*)')
      .eq('type', 'sale')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setPosts((data as PostRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const filtered = posts.filter((p) => {
    const s = p.sale_listings?.[0]
    if (!s) return false
    if (cat === 'All') return true
    if (cat === 'Accommodations') return s.is_accommodation
    return !s.is_accommodation && s.category === cat
  })

  return (
    <div className="with-bottom-nav">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Sales</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowComposer(true)}>
            <Plus size={14} /> List
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                cat === c ? 'bg-ub-blue text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="card">
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏷️</div>
            <div className="font-medium text-gray-700 mb-1">Nothing for sale here</div>
            <div className="text-sm text-gray-400">List an item or a room</div>
          </div>
        ) : (
          filtered.map((p) => {
            const s = p.sale_listings![0]
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/sales/${p.id}`)}
                className="card mb-3 w-full text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.users} size={36} />
                    <div>
                      <div className="text-sm font-medium">{p.users?.display_name}</div>
                      <div className="text-xs text-gray-400">{timeAgo(p.created_at)}</div>
                    </div>
                  </div>
                  <span className="chip chip-blue capitalize">
                    {s.is_accommodation ? s.accommodation_type?.replace('_', ' ') : s.category}
                  </span>
                </div>
                <div className="h-24 bg-gray-50 rounded-xl flex items-center justify-center mb-2 text-3xl opacity-20">
                  {s.is_accommodation ? '🏠' : '📦'}
                </div>
                <div className="text-sm font-medium">{p.title}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-sm">
                    {s.is_accommodation && s.lease_price_monthly != null
                      ? `$${s.lease_price_monthly.toFixed(0)}/mo`
                      : s.price != null
                        ? `$${s.price.toFixed(2)}`
                        : '—'}
                  </span>
                  <span className="chip">
                    <MessageCircle size={11} /> Message
                  </span>
                </div>
                {s.is_accommodation && (
                  <div className="mt-2 text-[11px] text-[#B54708] bg-[#FFFAEB] rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                    <Info size={11} /> Info only · arrange lease directly
                  </div>
                )}
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
