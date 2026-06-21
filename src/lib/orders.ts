import { supabase } from './supabase'
import type { PostRow, FoodListingRow } from './types'

// Place a food order. Payments are external — this only creates the tracked
// record. Pickup is a single-leg order (seller confirms). Delivery starts the
// chain-of-custody flow once a rider claims it.
export async function placeFoodOrder({
  buyerId,
  post,
  food,
  fulfillment,
  paymentMethod,
}: {
  buyerId: string
  post: PostRow
  food: FoodListingRow
  fulfillment: 'pickup' | 'delivery'
  paymentMethod: string
}): Promise<string> {
  const deliveryFee = fulfillment === 'delivery' ? (food.delivery_fee ?? 0) : 0

  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      seller_id: post.user_id,
      post_id: post.id,
      order_type: 'food',
      amount: food.price,
      delivery_fee: deliveryFee,
      fulfillment,
      custody: 'seller',
      payment_method: paymentMethod,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to place order')

  // Best-effort quantity decrement; auto-close when sold out.
  const remaining = Math.max(0, food.quantity_remaining - 1)
  await supabase
    .from('food_listings')
    .update({ quantity_remaining: remaining })
    .eq('id', food.id)
  if (remaining === 0) {
    await supabase.from('posts').update({ status: 'sold' }).eq('id', post.id)
  }

  return data.id
}

// Book a seat on a scheduled ride.
export async function bookRideSeat({
  buyerId,
  post,
  sellerId,
  pricePerSeat,
  seatsRemaining,
  rideListingId,
  paymentMethod,
}: {
  buyerId: string
  post: PostRow
  sellerId: string
  pricePerSeat: number
  seatsRemaining: number
  rideListingId: string
  paymentMethod: string
}): Promise<string> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      post_id: post.id,
      order_type: 'ride',
      amount: pricePerSeat,
      fulfillment: null,
      payment_method: paymentMethod,
      status: 'accepted',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to book seat')

  const remaining = Math.max(0, seatsRemaining - 1)
  await supabase.from('ride_listings').update({ seats_remaining: remaining }).eq('id', rideListingId)
  if (remaining === 0) {
    await supabase.from('posts').update({ status: 'sold' }).eq('id', post.id)
  }

  return data.id
}

// One side marks an order paid. The DB trigger completes the order once both
// sides have confirmed.
export async function markPaid(orderId: string, side: 'buyer' | 'seller'): Promise<void> {
  const field = side === 'buyer' ? 'buyer_marked_paid' : 'seller_marked_paid'
  const { error } = await supabase.from('orders').update({ [field]: true }).eq('id', orderId)
  if (error) throw new Error(error.message)
}
