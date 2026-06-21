// ============================================================
// Shared database row types — mirror of supabase-schema.sql
// Keep in sync when the schema changes.
// ============================================================

export type LocationZone = 'north_campus' | 'south_campus' | 'off_campus'

export type UserRow = {
  id: string
  created_at: string
  auth_id: string | null
  display_name: string
  real_name: string | null
  photo_url: string | null
  avatar_emoji: string
  is_ub_verified: boolean
  is_anonymous: boolean
  is_banned: boolean
  priorities: string[]
  location_zone: LocationZone | null
  venmo_handle: string | null
  cashapp_handle: string | null
  rating: number
  rating_count: number
  total_orders: number
  total_rides: number
  no_shows: number
  earned_tags: string[]
}

export type PostType = 'food' | 'ride' | 'sale' | 'event' | 'community'

export type PostStatus = 'active' | 'sold' | 'completed' | 'cancelled' | 'expired'

export type PostRow = {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  type: PostType
  title: string
  description: string | null
  image_url: string | null
  location_zone: LocationZone | null
  location_label: string | null
  status: PostStatus
  expires_at: string | null
  like_count: number
  view_count: number
  users?: UserRow
  food_listings?: FoodListingRow[]
  ride_listings?: RideListingRow[]
  sale_listings?: SaleListingRow[]
  event_listings?: EventListingRow[]
}

export type FoodListingRow = {
  id: string
  post_id: string
  price: number
  pickup_available: boolean
  delivery_available: boolean
  delivery_fee: number | null
  quantity_total: number
  quantity_remaining: number
  available_from: string | null
  available_until: string | null
  dietary_tags: string[]
}

export type RideMode = 'scheduled' | 'instant'

export type RideListingRow = {
  id: string
  post_id: string
  pickup_label: string
  dropoff_label: string
  departure_time: string
  estimated_minutes: number | null
  seats_total: number
  seats_remaining: number
  price_per_seat: number
  vehicle_description: string | null
  accepts_food_delivery: boolean
  ride_mode: RideMode
}

export type SaleCondition = 'new' | 'like_new' | 'good' | 'fair' | 'parts'
export type AccommodationType = 'sublease' | 'room_wanted' | 'roommate'

export type SaleListingRow = {
  id: string
  post_id: string
  price: number | null
  condition: SaleCondition | null
  category: string | null
  pickup_label: string | null
  is_accommodation: boolean
  accommodation_type: AccommodationType | null
  lease_price_monthly: number | null
  lease_from: string | null
  lease_until: string | null
}

export type EventListingRow = {
  id: string
  post_id: string
  event_time: string | null
  event_location: string | null
  interested_count: number
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rider_assigned'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type OrderRow = {
  id: string
  created_at: string
  updated_at: string
  buyer_id: string
  seller_id: string
  rider_id: string | null
  post_id: string
  order_type: 'food' | 'ride' | 'sale'
  amount: number
  delivery_fee: number
  fulfillment: 'pickup' | 'delivery' | null
  custody: 'seller' | 'rider' | 'buyer'
  payment_method: string | null
  buyer_marked_paid: boolean
  seller_marked_paid: boolean
  seller_confirmed_handoff: boolean
  rider_confirmed_handoff: boolean
  payment_note: string | null
  status: OrderStatus
  accepted_at: string | null
  handoff_at: string | null
  delivered_at: string | null
  completed_at: string | null
  // optional joins
  posts?: PostRow
  buyer?: UserRow
  seller?: UserRow
  rider?: UserRow
}

export type MessageRow = {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  post_id: string | null
  content: string
  read_at: string | null
  conversation_id: string
}

export type NotificationRow = {
  id: string
  created_at: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
}
