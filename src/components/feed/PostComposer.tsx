'use client'
import { useState } from 'react'
import { X, UtensilsCrossed, Car, Tag, Calendar, MessageSquare, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { createPost } from '@/lib/posts'
import { ZONES, DIETARY_TAGS, SALE_CATEGORIES } from '@/lib/constants'
import type { PostType, LocationZone } from '@/lib/types'

type Props = { onClose: () => void; onPosted: () => void }

const TYPES = [
  { key: 'food', icon: UtensilsCrossed, label: 'Food', desc: 'Sell what you cooked' },
  { key: 'ride', icon: Car, label: 'Ride', desc: 'Offer a ride' },
  { key: 'sale', icon: Tag, label: 'Sale', desc: 'Sell an item or list a room' },
  { key: 'event', icon: Calendar, label: 'Event', desc: 'Share an event' },
  { key: 'community', icon: MessageSquare, label: 'Community', desc: 'Share anything' },
] as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  )
}

export default function PostComposer({ onClose, onPosted }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [type, setType] = useState<PostType>('food')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // shared
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [zone, setZone] = useState<LocationZone | ''>(user?.location_zone ?? '')
  const [locationLabel, setLocationLabel] = useState('')

  // food
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [pickup, setPickup] = useState(true)
  const [delivery, setDelivery] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState('2')
  const [availableUntil, setAvailableUntil] = useState('')
  const [diet, setDiet] = useState<string[]>([])

  // ride
  const [pickupLabel, setPickupLabel] = useState('')
  const [dropoffLabel, setDropoffLabel] = useState('')
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState('3')

  // sale
  const [condition, setCondition] = useState('good')
  const [category, setCategory] = useState<string>('furniture')
  const [isAccommodation, setIsAccommodation] = useState(false)
  const [accommodationType, setAccommodationType] = useState('sublease')
  const [leaseMonthly, setLeaseMonthly] = useState('')

  // event
  const [eventTime, setEventTime] = useState('')

  function pick(t: PostType) {
    setType(t)
    setStep('form')
  }

  function toggleDiet(t: string) {
    setDiet((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]))
  }

  function derivedTitle(): string {
    if (type === 'ride' && !title.trim() && pickupLabel && dropoffLabel) {
      return `${pickupLabel} → ${dropoffLabel}`
    }
    return title.trim()
  }

  async function submit() {
    if (!user) return
    setError('')
    const finalTitle = derivedTitle()
    if (!finalTitle) {
      setError('Add a title')
      return
    }
    setSaving(true)
    try {
      await createPost({
        userId: user.id,
        type,
        title: finalTitle,
        description: description.trim() || null,
        location_zone: zone || null,
        location_label: locationLabel.trim() || null,
        food:
          type === 'food'
            ? {
                price: parseFloat(price) || 0,
                pickup_available: pickup,
                delivery_available: delivery,
                delivery_fee: delivery ? parseFloat(deliveryFee) || 0 : null,
                quantity_total: parseInt(quantity) || 1,
                available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
                dietary_tags: diet,
              }
            : undefined,
        ride:
          type === 'ride'
            ? {
                pickup_label: pickupLabel,
                dropoff_label: dropoffLabel,
                departure_time: departure
                  ? new Date(departure).toISOString()
                  : new Date().toISOString(),
                seats_total: parseInt(seats) || 1,
                price_per_seat: parseFloat(price) || 0,
                vehicle_description: null,
              }
            : undefined,
        sale:
          type === 'sale'
            ? {
                price: isAccommodation ? null : parseFloat(price) || 0,
                condition: isAccommodation ? null : condition,
                category: isAccommodation ? 'accommodation' : category,
                pickup_label: locationLabel.trim() || null,
                is_accommodation: isAccommodation,
                accommodation_type: isAccommodation ? accommodationType : null,
                lease_price_monthly: isAccommodation ? parseFloat(leaseMonthly) || 0 : null,
              }
            : undefined,
        event:
          type === 'event'
            ? {
                event_time: eventTime ? new Date(eventTime).toISOString() : null,
                event_location: locationLabel.trim() || null,
              }
            : undefined,
      })
      onPosted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-end">
      <div
        className="bg-white w-full max-w-[480px] mx-auto rounded-t-[20px] p-4 max-h-[92vh] overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium text-base flex items-center gap-2">
            {step === 'form' && (
              <button onClick={() => setStep('type')} className="text-gray-400">
                <ArrowLeft size={18} />
              </button>
            )}
            {step === 'type' ? 'What are you posting?' : `New ${type} post`}
          </span>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        {step === 'type' ? (
          <div className="flex flex-col gap-2">
            {TYPES.map(({ key, icon: Icon, label, desc }) => (
              <button
                key={key}
                onClick={() => pick(key)}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-ub-blue text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {type !== 'ride' && (
              <Field label="Title *">
                <input
                  className="input"
                  placeholder={
                    type === 'food'
                      ? 'e.g. Homemade chicken biryani'
                      : type === 'sale'
                        ? 'e.g. IKEA desk, great condition'
                        : type === 'event'
                          ? 'e.g. Snow day on North Campus'
                          : "What's on your mind?"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
            )}

            <Field label={type === 'community' ? 'Details' : 'Description'}>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Add details…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* FOOD */}
            {type === 'food' && (
              <>
                <div className="flex gap-2">
                  <Field label="Price ($)">
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </Field>
                  <Field label="Quantity">
                    <input
                      className="input"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPickup((v) => !v)}
                    className={`flex-1 py-2 rounded-lg border text-sm ${pickup ? 'border-ub-blue text-ub-blue bg-ub-light' : 'border-gray-200 text-gray-500'}`}
                  >
                    Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery((v) => !v)}
                    className={`flex-1 py-2 rounded-lg border text-sm ${delivery ? 'border-ub-blue text-ub-blue bg-ub-light' : 'border-gray-200 text-gray-500'}`}
                  >
                    Delivery
                  </button>
                </div>
                {delivery && (
                  <Field label="Delivery fee ($)">
                    <input
                      className="input"
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Ready until">
                  <input
                    className="input"
                    type="datetime-local"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                  />
                </Field>
                <Field label="Dietary tags">
                  <div className="flex flex-wrap gap-1.5">
                    {DIETARY_TAGS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleDiet(t)}
                        className={`chip ${diet.includes(t) ? 'chip-green' : ''}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {/* RIDE */}
            {type === 'ride' && (
              <>
                <Field label="Pickup *">
                  <input
                    className="input"
                    placeholder="North campus · Ring Rd"
                    value={pickupLabel}
                    onChange={(e) => setPickupLabel(e.target.value)}
                  />
                </Field>
                <Field label="Dropoff *">
                  <input
                    className="input"
                    placeholder="Buffalo airport (BUF)"
                    value={dropoffLabel}
                    onChange={(e) => setDropoffLabel(e.target.value)}
                  />
                </Field>
                <Field label="Departure">
                  <input
                    className="input"
                    type="datetime-local"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <Field label="Seats">
                    <input
                      className="input"
                      type="number"
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                    />
                  </Field>
                  <Field label="Price / seat ($)">
                    <input
                      className="input"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            {/* SALE */}
            {type === 'sale' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsAccommodation((v) => !v)}
                  className={`py-2 rounded-lg border text-sm ${isAccommodation ? 'border-ub-blue text-ub-blue bg-ub-light' : 'border-gray-200 text-gray-500'}`}
                >
                  {isAccommodation ? '🏠 Accommodation listing' : 'Mark as accommodation'}
                </button>
                {isAccommodation ? (
                  <>
                    <Field label="Type">
                      <select
                        className="input"
                        value={accommodationType}
                        onChange={(e) => setAccommodationType(e.target.value)}
                      >
                        <option value="sublease">Sublease</option>
                        <option value="room_wanted">Room wanted</option>
                        <option value="roommate">Roommate</option>
                      </select>
                    </Field>
                    <Field label="Monthly price ($)">
                      <input
                        className="input"
                        type="number"
                        value={leaseMonthly}
                        onChange={(e) => setLeaseMonthly(e.target.value)}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Field label="Price ($)">
                        <input
                          className="input"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </Field>
                      <Field label="Condition">
                        <select
                          className="input"
                          value={condition}
                          onChange={(e) => setCondition(e.target.value)}
                        >
                          <option value="new">New</option>
                          <option value="like_new">Like new</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="parts">For parts</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Category">
                      <select
                        className="input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {SALE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </>
            )}

            {/* EVENT */}
            {type === 'event' && (
              <Field label="When">
                <input
                  className="input"
                  type="datetime-local"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </Field>
            )}

            {/* Location (all but ride which has its own) */}
            {type !== 'ride' && (
              <>
                <Field label="Location label">
                  <input
                    className="input"
                    placeholder="Ellicott complex"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                  />
                </Field>
                <Field label="Zone">
                  <select
                    className="input"
                    value={zone}
                    onChange={(e) => setZone(e.target.value as LocationZone)}
                  >
                    <option value="">Select zone…</option>
                    {ZONES.map((z) => (
                      <option key={z.key} value={z.key}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            {(type === 'food' || type === 'sale' || type === 'ride') && !user?.venmo_handle && (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                💡 Add your Venmo handle in Profile → Payment handles so buyers can pay you
                directly.
              </div>
            )}

            {error && <div className="text-xs text-red-500">{error}</div>}

            <button onClick={submit} disabled={saving} className="btn btn-primary w-full py-3">
              {saving && <Loader2 size={16} className="animate-spin" />}
              Post to feed
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
