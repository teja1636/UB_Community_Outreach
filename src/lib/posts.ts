import { supabase } from './supabase'
import type { PostType, LocationZone } from './types'

export type FoodFields = {
  price: number
  pickup_available: boolean
  delivery_available: boolean
  delivery_fee: number | null
  quantity_total: number
  available_until: string | null
  dietary_tags: string[]
}

export type RideFields = {
  pickup_label: string
  dropoff_label: string
  departure_time: string
  seats_total: number
  price_per_seat: number
  vehicle_description: string | null
}

export type SaleFields = {
  price: number | null
  condition: string | null
  category: string | null
  pickup_label: string | null
  is_accommodation: boolean
  accommodation_type: string | null
  lease_price_monthly: number | null
}

export type EventFields = {
  event_time: string | null
  event_location: string | null
}

export type CreatePostInput = {
  userId: string
  type: PostType
  title: string
  description: string | null
  location_zone: LocationZone | null
  location_label: string | null
  food?: FoodFields
  ride?: RideFields
  sale?: SaleFields
  event?: EventFields
}

// Creates a post plus its type-specific detail row. Returns the new post id.
export async function createPost(input: CreatePostInput): Promise<string> {
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      description: input.description,
      location_zone: input.location_zone,
      location_label: input.location_label,
    })
    .select('id')
    .single()

  if (error || !post) throw new Error(error?.message ?? 'Failed to create post')
  const postId = post.id as string

  if (input.type === 'food' && input.food) {
    const f = input.food
    const { error: e } = await supabase.from('food_listings').insert({
      post_id: postId,
      price: f.price,
      pickup_available: f.pickup_available,
      delivery_available: f.delivery_available,
      delivery_fee: f.delivery_available ? f.delivery_fee : null,
      quantity_total: f.quantity_total,
      quantity_remaining: f.quantity_total,
      available_until: f.available_until,
      dietary_tags: f.dietary_tags,
    })
    if (e) throw new Error(e.message)
  } else if (input.type === 'ride' && input.ride) {
    const r = input.ride
    const { error: e } = await supabase.from('ride_listings').insert({
      post_id: postId,
      pickup_label: r.pickup_label,
      dropoff_label: r.dropoff_label,
      departure_time: r.departure_time,
      seats_total: r.seats_total,
      seats_remaining: r.seats_total,
      price_per_seat: r.price_per_seat,
      vehicle_description: r.vehicle_description,
      ride_mode: 'scheduled',
    })
    if (e) throw new Error(e.message)
  } else if (input.type === 'sale' && input.sale) {
    const s = input.sale
    const { error: e } = await supabase.from('sale_listings').insert({
      post_id: postId,
      price: s.price,
      condition: s.condition,
      category: s.category,
      pickup_label: s.pickup_label,
      is_accommodation: s.is_accommodation,
      accommodation_type: s.accommodation_type,
      lease_price_monthly: s.lease_price_monthly,
    })
    if (e) throw new Error(e.message)
  } else if (input.type === 'event' && input.event) {
    const ev = input.event
    const { error: e } = await supabase.from('event_listings').insert({
      post_id: postId,
      event_time: ev.event_time,
      event_location: ev.event_location,
    })
    if (e) throw new Error(e.message)
  }

  return postId
}
