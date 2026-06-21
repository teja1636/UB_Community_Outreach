'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MessageCircle, Info, MapPin, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { sendMessage } from '@/lib/messages'
import type { PostRow } from '@/lib/types'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Avatar from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/trust'

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const [post, setPost] = useState<PostRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supabase
      .from('posts')
      .select('*, users(*), sale_listings(*)')
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
        <ScreenHeader title="Listing" />
        <div className="p-4">
          <div className="skeleton h-40 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const sale = post?.sale_listings?.[0]
  if (!post || !sale) {
    return (
      <div>
        <ScreenHeader title="Listing" />
        <div className="p-8 text-center text-sm text-gray-400">This listing is no longer available.</div>
      </div>
    )
  }

  const seller = post.users
  const isOwn = me?.id === post.user_id

  async function message() {
    if (!me || !post) return
    setSending(true)
    try {
      await sendMessage({
        senderId: me.id,
        receiverId: post.user_id,
        postId: post.id,
        content: `Hi! Is "${post.title}" still available?`,
      })
      router.push(`/messages/${post.user_id}`)
    } catch {
      setSending(false)
    }
  }

  return (
    <div>
      <ScreenHeader title="Listing" />
      <div className="p-4">
        <div className="h-44 bg-gray-50 rounded-xl flex items-center justify-center mb-3 text-5xl opacity-20">
          {sale.is_accommodation ? '🏠' : '📦'}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Avatar user={seller} size={36} />
          <div>
            <div className="text-sm font-medium">{seller?.display_name}</div>
            <div className="text-xs text-gray-400">{timeAgo(post.created_at)}</div>
          </div>
        </div>

        <div className="text-lg font-semibold">{post.title}</div>
        <div className="text-xl font-bold text-ub-blue my-1">
          {sale.is_accommodation && sale.lease_price_monthly != null
            ? `$${sale.lease_price_monthly.toFixed(0)}/mo`
            : sale.price != null
              ? `$${sale.price.toFixed(2)}`
              : '—'}
        </div>
        {post.description && <p className="text-sm text-gray-500 my-2">{post.description}</p>}

        <div className="flex flex-wrap gap-1.5 my-3">
          {sale.condition && <span className="chip capitalize">{sale.condition.replace('_', ' ')}</span>}
          {sale.category && <span className="chip capitalize">{sale.category}</span>}
          {sale.pickup_label && (
            <span className="chip">
              <MapPin size={11} /> {sale.pickup_label}
            </span>
          )}
        </div>

        {sale.is_accommodation && (
          <div className="text-xs text-[#B54708] bg-[#FFFAEB] rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5">
            <Info size={13} /> Info only — arrange the lease directly. UB Community does not handle
            deposits or contracts.
          </div>
        )}

        <button className="btn btn-primary w-full py-3" onClick={message} disabled={sending || isOwn}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
          {isOwn ? 'This is your listing' : 'Message seller'}
        </button>
      </div>
    </div>
  )
}
