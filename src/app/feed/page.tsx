'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MessageCircle, PenSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PostRow } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import Avatar from '@/components/ui/Avatar'
import BottomNav from '@/components/ui/BottomNav'
import PostCard from '@/components/feed/PostCard'
import PostComposer from '@/components/feed/PostComposer'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'ride', label: 'Rides' },
  { key: 'sale', label: 'Sales' },
  { key: 'event', label: 'Events' },
  { key: 'community', label: 'Community' },
]

const PAGE_SIZE = 15

const SELECT = `
  *,
  users (*),
  food_listings (*),
  ride_listings (*),
  sale_listings (*),
  event_listings (*)
`

export default function FeedPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [showComposer, setShowComposer] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    async (from: number, replace: boolean) => {
      let query = supabase
        .from('posts')
        .select(SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (filter !== 'all') query = query.eq('type', filter)

      const { data, error } = await query
      if (!error && data) {
        const rows = data as PostRow[]
        setHasMore(rows.length === PAGE_SIZE)
        setPosts((prev) => (replace ? rows : [...prev, ...rows]))
      }
    },
    [filter],
  )

  // Reload from the top whenever the filter changes.
  useEffect(() => {
    setLoading(true)
    setHasMore(true)
    fetchPage(0, true).then(() => setLoading(false))
  }, [filter, fetchPage])

  // Which of the loaded posts has the current user liked?
  useEffect(() => {
    if (!me || posts.length === 0) return
    const ids = posts.map((p) => p.id)
    supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', me.id)
      .in('post_id', ids)
      .then(({ data }) => {
        if (data) setLikedIds(new Set(data.map((d) => d.post_id as string)))
      })
  }, [me, posts])

  useEffect(() => {
    if (!me) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', me.id)
      .is('read_at', null)
      .then(({ count }) => setUnreadNotifs(count ?? 0))
  }, [me])

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current
    if (!el || loading || !hasMore) return
    const obs = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true)
          await fetchPage(posts.length, false)
          setLoadingMore(false)
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading, hasMore, loadingMore, posts.length, fetchPage])

  return (
    <div className="with-bottom-nav">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ub-blue flex items-center justify-center">
              <span className="text-white font-semibold text-sm">UB</span>
            </div>
            <span className="font-semibold text-base">UB community</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="relative text-gray-500"
              onClick={() => router.push('/notifications')}
            >
              <Bell size={22} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button className="text-gray-500" onClick={() => router.push('/messages')}>
              <MessageCircle size={22} />
            </button>
            <button onClick={() => router.push('/profile')}>
              <Avatar user={me} size={30} />
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={() => setShowComposer(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 text-left hover:bg-gray-50 transition-colors"
          >
            <PenSquare size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400 flex-1">What&apos;s happening on campus?</span>
            <span className="btn btn-primary btn-sm">Post</span>
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-ub-blue text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="flex gap-3 mb-3">
                  <div className="skeleton w-9 h-9 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-3 w-32 mb-1.5 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                </div>
                <div className="skeleton h-40 w-full rounded-xl mb-3" />
                <div className="skeleton h-3 w-3/4 rounded mb-1.5" />
                <div className="skeleton h-2.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-medium text-gray-700 mb-1">Nothing here yet</div>
            <div className="text-sm text-gray-400">Be the first to post something</div>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} liked={likedIds.has(post.id)} />
            ))}
            <div ref={sentinel} className="h-8 flex items-center justify-center">
              {loadingMore && <span className="text-xs text-gray-400">Loading…</span>}
            </div>
          </>
        )}
      </div>

      {showComposer && (
        <PostComposer
          onClose={() => setShowComposer(false)}
          onPosted={() => {
            setShowComposer(false)
            setLoading(true)
            fetchPage(0, true).then(() => setLoading(false))
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}
