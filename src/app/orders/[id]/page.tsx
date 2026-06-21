'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check, ArrowLeftRight, MessageCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { markPaid } from '@/lib/orders'
import type { OrderRow, PostRow, UserRow } from '@/lib/types'
import ScreenHeader from '@/components/ui/ScreenHeader'

type FullOrder = OrderRow & {
  posts?: PostRow
  buyer?: UserRow
  seller?: UserRow
  rider?: UserRow
}

const STEP_ORDER = ['pending', 'accepted', 'rider_assigned', 'in_transit', 'delivered', 'completed']

export default function OrderTrackPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const [order, setOrder] = useState<FullOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(
        '*, posts(*), buyer:buyer_id(*), seller:seller_id(*), rider:rider_id(*)',
      )
      .eq('id', id)
      .maybeSingle()
    setOrder(data as FullOrder | null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, load])

  if (loading) {
    return (
      <div>
        <ScreenHeader title="Order" />
        <div className="p-4">
          <div className="skeleton h-16 w-full rounded-xl" />
        </div>
      </div>
    )
  }
  if (!order || !me) {
    return (
      <div>
        <ScreenHeader title="Order" />
        <div className="p-8 text-center text-sm text-gray-400">Order not found.</div>
      </div>
    )
  }

  const isBuyer = me.id === order.buyer_id
  const isSeller = me.id === order.seller_id
  const isRider = me.id === order.rider_id
  const isThirdParty = !isBuyer && !isSeller && !isRider
  const isDelivery = order.fulfillment === 'delivery'
  const total = order.amount + (order.delivery_fee ?? 0)
  const currentIdx = STEP_ORDER.indexOf(order.status)

  async function update(patch: Partial<OrderRow>) {
    setBusy(true)
    await supabase.from('orders').update(patch).eq('id', order!.id)
    await load()
    setBusy(false)
  }

  async function claim() {
    setBusy(true)
    await supabase.rpc('claim_delivery', { p_order_id: order!.id })
    await load()
    setBusy(false)
  }

  async function pay(side: 'buyer' | 'seller') {
    setBusy(true)
    await markPaid(order!.id, side)
    await load()
    setBusy(false)
  }

  // Build the visible steps.
  const steps: { key: string; label: string; sub?: string }[] = isDelivery
    ? [
        { key: 'pending', label: 'Order placed' },
        { key: 'accepted', label: 'Seller cooking' },
        { key: 'rider_assigned', label: 'Rider claimed', sub: order.rider?.display_name },
        { key: 'in_transit', label: 'In transit' },
        { key: 'delivered', label: 'Delivered' },
        { key: 'completed', label: 'Both mark paid → completed' },
      ]
    : [
        { key: 'pending', label: 'Order placed' },
        { key: 'accepted', label: 'Seller preparing' },
        { key: 'delivered', label: 'Picked up' },
        { key: 'completed', label: 'Both mark paid → completed' },
      ]

  const handoffActive =
    order.status === 'rider_assigned' &&
    (!order.seller_confirmed_handoff || !order.rider_confirmed_handoff)

  return (
    <div>
      <ScreenHeader
        title={`Order`}
        right={
          <button onClick={() => router.push('/messages')} className="text-gray-500">
            <MessageCircle size={20} />
          </button>
        }
      />
      <div className="p-4">
        {/* Summary */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl">
            🍱
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">
              {order.posts?.title} · {order.fulfillment}
            </div>
            <div className="text-xs text-gray-400">{order.seller?.display_name}</div>
          </div>
          <div className="text-sm font-medium">${total.toFixed(2)}</div>
        </div>

        {/* Stepper */}
        <div className="relative pl-1 mb-5">
          {steps.map((s, i) => {
            const stepIdx = STEP_ORDER.indexOf(s.key)
            const done = currentIdx >= stepIdx && order.status !== 'cancelled'
            const isHandoff = s.key === 'rider_assigned'
            const current = currentIdx === stepIdx
            return (
              <div key={s.key} className="flex gap-3 pb-4 relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[8px] top-4 bottom-0 w-0.5 bg-gray-200" />
                )}
                <div
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    isHandoff && order.custody === 'rider'
                      ? 'bg-[#EF9F27]'
                      : done
                        ? 'bg-ub-blue'
                        : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {isHandoff && order.custody === 'rider' ? (
                    <ArrowLeftRight size={10} className="text-white" />
                  ) : done ? (
                    <Check size={11} className="text-white" />
                  ) : null}
                </div>
                <div>
                  <div
                    className={`text-sm ${current ? 'font-medium text-ub-blue' : done ? 'font-medium' : 'text-gray-400'}`}
                  >
                    {s.label}
                  </div>
                  {s.sub && <div className="text-xs text-gray-400">{s.sub}</div>}
                  {isHandoff && handoffActive && (
                    <div className="text-xs text-[#B54708] mt-0.5">
                      Handoff — both seller & rider confirm
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isSeller && order.status === 'pending' && (
            <button className="btn btn-primary py-3" disabled={busy} onClick={() => update({ status: 'accepted', accepted_at: new Date().toISOString() })}>
              {busy && <Loader2 size={15} className="animate-spin" />} Accept &amp; start
            </button>
          )}

          {isThirdParty && isDelivery && order.status === 'accepted' && !order.rider_id && (
            <button className="btn btn-primary py-3" disabled={busy} onClick={claim}>
              {busy && <Loader2 size={15} className="animate-spin" />} Claim this delivery
            </button>
          )}

          {handoffActive && (isSeller || isRider) && (
            <button
              className="btn btn-primary py-3"
              disabled={
                busy ||
                (isSeller && order.seller_confirmed_handoff) ||
                (isRider && order.rider_confirmed_handoff)
              }
              onClick={() =>
                update(
                  isSeller
                    ? { seller_confirmed_handoff: true }
                    : { rider_confirmed_handoff: true },
                )
              }
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {(isSeller && order.seller_confirmed_handoff) ||
              (isRider && order.rider_confirmed_handoff)
                ? 'Waiting for other party…'
                : 'Confirm handoff'}
            </button>
          )}

          {isBuyer && (order.status === 'in_transit' || (!isDelivery && order.status === 'accepted')) && (
            <button className="btn btn-primary py-3" disabled={busy} onClick={() => update({ status: 'delivered', delivered_at: new Date().toISOString() })}>
              {busy && <Loader2 size={15} className="animate-spin" />} Confirm received
            </button>
          )}

          {/* Mark paid — once delivered, both sides confirm */}
          {(order.status === 'delivered' || order.status === 'completed') && (
            <div className="bg-gray-50 rounded-xl p-3 mt-1">
              <div className="text-sm font-medium mb-2">Payment</div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Buyer paid</span>
                {order.buyer_marked_paid ? (
                  <span className="text-[#027A48] flex items-center gap-1">
                    <Check size={14} /> Confirmed
                  </span>
                ) : isBuyer ? (
                  <button className="btn btn-sm" disabled={busy} onClick={() => pay('buyer')}>
                    Mark as paid
                  </button>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Seller received</span>
                {order.seller_marked_paid ? (
                  <span className="text-[#027A48] flex items-center gap-1">
                    <Check size={14} /> Confirmed
                  </span>
                ) : isSeller ? (
                  <button className="btn btn-sm" disabled={busy} onClick={() => pay('seller')}>
                    Mark as paid
                  </button>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </div>
              {order.status === 'completed' && (
                <div className="text-xs text-[#027A48] text-center mt-3 font-medium">
                  ✓ Order completed
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
