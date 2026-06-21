'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Check, UtensilsCrossed, Car, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { markPaid } from '@/lib/orders'
import type { OrderRow, PostRow } from '@/lib/types'
import BottomNav from '@/components/ui/BottomNav'

type WalletOrder = OrderRow & { posts?: PostRow }

const TYPE_ICON = { food: UtensilsCrossed, ride: Car, sale: Tag }
const TYPE_BG = { food: 'bg-[#FFF8ED] text-[#B54708]', ride: 'bg-[#EFF8FF] text-[#175CD3]', sale: 'bg-[#F9F5FF] text-[#6941C6]' }

export default function WalletPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const [orders, setOrders] = useState<WalletOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!me) return
    const { data } = await supabase
      .from('orders')
      .select('*, posts(title, type)')
      .or(`buyer_id.eq.${me.id},seller_id.eq.${me.id},rider_id.eq.${me.id}`)
      .order('created_at', { ascending: false })
    setOrders((data as WalletOrder[]) ?? [])
    setLoading(false)
  }, [me])

  useEffect(() => {
    load()
  }, [load])

  if (!me || loading) {
    return (
      <div className="with-bottom-nav">
        <div className="sticky top-0 bg-white z-40 border-b border-gray-100 flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Wallet</span>
          <span className="text-xs text-gray-400">tracked, not held</span>
        </div>
        <div className="p-4">
          <div className="skeleton h-24 w-full rounded-xl" />
        </div>
        <BottomNav />
      </div>
    )
  }

  const myFlag = (o: WalletOrder) => (o.seller_id === me.id ? o.seller_marked_paid : o.buyer_marked_paid)
  const mySide = (o: WalletOrder): 'buyer' | 'seller' => (o.seller_id === me.id ? 'seller' : 'buyer')

  const pending = orders.filter(
    (o) => o.status === 'delivered' && !myFlag(o) && o.seller_id !== o.buyer_id,
  )
  const completed = orders.filter((o) => o.status === 'completed')

  // Net: earnings as seller minus spend as buyer, completed only.
  const net = completed.reduce((sum, o) => {
    if (o.seller_id === me.id) return sum + o.amount
    if (o.rider_id === me.id) return sum + (o.delivery_fee ?? 0)
    if (o.buyer_id === me.id) return sum - (o.amount + (o.delivery_fee ?? 0))
    return sum
  }, 0)

  async function pay(o: WalletOrder) {
    setBusy(o.id)
    await markPaid(o.id, mySide(o))
    await load()
    setBusy(null)
  }

  function Icon({ type }: { type: 'food' | 'ride' | 'sale' }) {
    const I = TYPE_ICON[type]
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${TYPE_BG[type]}`}>
        <I size={14} />
      </div>
    )
  }

  return (
    <div className="with-bottom-nav">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">Wallet</span>
        <span className="text-xs text-gray-400">tracked, not held</span>
      </div>

      <div className="p-4">
        <div className="bg-ub-blue rounded-2xl p-5 text-center mb-4">
          <div className="text-xs text-white/70 mb-1">Net this period</div>
          <div className="text-3xl font-semibold text-white">
            {net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(2)}
          </div>
        </div>

        <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Clock size={14} /> Pending payment
        </div>
        {pending.length === 0 ? (
          <div className="text-xs text-gray-400 border border-gray-100 rounded-xl p-4 text-center mb-5">
            Nothing pending. Payments you owe or are owed show up here.
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {pending.map((o) => (
              <div key={o.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Icon type={o.order_type} />
                    <div>
                      <div className="text-sm font-medium">{o.posts?.title ?? 'Order'}</div>
                      <div className="text-xs text-gray-400">
                        {mySide(o) === 'seller' ? 'confirm you were paid' : 'pay & confirm'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${(o.amount + (o.delivery_fee ?? 0)).toFixed(2)}</div>
                </div>
                <button className="btn btn-primary w-full py-2 text-sm" disabled={busy === o.id} onClick={() => pay(o)}>
                  <Check size={14} /> Mark as paid
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="text-sm font-medium mb-2">Completed</div>
        {completed.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No completed transactions yet.</div>
        ) : (
          completed.map((o) => {
            const incoming = o.seller_id === me.id || o.rider_id === me.id
            const amt = o.rider_id === me.id ? (o.delivery_fee ?? 0) : o.amount + (o.delivery_fee ?? 0)
            return (
              <button
                key={o.id}
                onClick={() => router.push(`/orders/${o.id}`)}
                className="w-full flex items-center justify-between py-2.5 border-b border-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Icon type={o.order_type} />
                  <div className="text-left">
                    <div className="text-sm font-medium">{o.posts?.title ?? 'Order'}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(o.completed_at ?? o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-medium ${incoming ? 'text-[#027A48]' : 'text-gray-700'}`}>
                  {incoming ? '+' : '−'}${amt.toFixed(2)}
                </span>
              </button>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
