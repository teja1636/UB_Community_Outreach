# MASTER BUILD PROMPT — UB Community

> Paste this whole prompt to your AI builder (e.g. Claude Code) as the single source of truth for the project. It contains the mission, the principles, the full feature spec, the data and security model, the design system, the build order, and the hard guardrails. When any later instruction conflicts with this document, this document wins. Build incrementally, one numbered step at a time, and never violate the guardrails.

---

## 1. Your role and the mission

You are building **UB Community** — a free, open-source, mobile-first web platform for University at Buffalo students. It bundles four peer-to-peer services into one feed-first app:

- **Feed** — a chronological, blended stream of food, rides, sales, events, and community posts. It is the front door and the discovery engine for everything else.
- **Food** — students sell homemade food; buyers pick it up or have a nearby student rider deliver it.
- **Rides** — students offer and request rides, both as scheduled listings and as instant, map-based requests.
- **Sales** — move-out items, plus an accommodations section for subleases and roommate searches (information only).

The product launches **free**, with **no fees and no money held by the platform**. Payments happen directly between people (Venmo / Cash App / cash); the platform only *records* them. Monetization and any blockchain/token ideas are explicitly **out of scope for this build** — do not implement them.

The platform must feel like a normal, polished consumer app. A student who has never heard of crypto, hashing, or "Web3" should never encounter any of those words.

---

## 2. Non-negotiable principles (the soul of the product)

1. **Store experience, not identity.** Keep reputation, posts, bookmarks, and preferences. Never store a user's real name, raw phone number, or email in application tables. The home screen says, verbatim: *"We're not storing your identity. We're storing your experience."* This is the core trust promise and the main marketing line.

2. **Anonymity is the default, and it is reversible.** A user signs up and appears as an animal avatar + pseudonym (e.g. "Buffalo #4821"). They MAY optionally add a real name and photo later; doing so flips them from anonymous to named. Everything is opt-in and reversible.

3. **No gating.** ANY signed-up user can sell food, drive, post, and list items from day one. UB verification is a *trust tag*, never a permission wall. Never block an action behind verification status.

4. **Verification is a trust accelerator, not a gate.** Verifying an @buffalo.edu email earns a green "UB verified" badge and (through nudges like "verified sellers get more orders") makes the account more attractive — but it is always optional.

5. **The account must be worth keeping.** Reputation (rating, completed orders, ride count, no-shows, earned tags) is permanently attached to the pseudonym and visible to others. This is simultaneously what makes a user feel valued AND what makes creating throwaway accounts pointless. Treat status and anti-abuse as the same lever.

6. **Payments are external; the platform only tracks.** Never build payment processing, escrow, custody of funds, or crypto. An order completes only when BOTH the buyer and the seller mark it paid.

---

## 3. Identity, signup, and anti-abuse (build this carefully)

- **Signup is phone OTP** via the auth provider's built-in phone one-time-password (SMS code). The auth provider holds the phone number only for delivering codes. In your own `users` table, store a one-way `phone_hash = sha256(phone + SERVER_PEPPER)` — never the raw number, never displayed anywhere. The hash enforces one account per phone (the main Sybil defense). `SERVER_PEPPER` is a server-side-only secret.
- **Before creating a user**, check a `blocked_identifiers` table for that phone hash; if present (a banned user), refuse signup. This makes bans actually stick without storing identity.
- **UB verification:** the user enters their @buffalo.edu address, receives a 6-digit code, and on success you set `is_ub_verified = true` and store only `ub_email_hash` (one-way). If that hash already exists on another account, refuse — one verified account per student. Never store the raw email.
- **If you ever offer email signup**, block disposable/temp-email domains with a maintained blocklist.
- **Trust tags shown next to a pseudonym:** `anonymous` (gray, default), `UB verified` (green check), `new member` (joined < 7 days — a gentle "be a little careful" signal, not a penalty), and earned tags stored in `users.earned_tags` such as `trusted_seller` (e.g. 10+ orders, 4.5+ rating), `top_rider`, and `quick_replier`. If a user added a real photo, show it instead of the avatar.

---

## 4. The feed

Chronological, newest-first, infinite scroll — no opaque ranking algorithm. It blends every post type into one stream. Guardrails that keep chronological usable:

- **Filter chips** (All / Food / Rides / Sales / Events) narrow the view without changing the sort. A "Near me" filter scopes by campus zone.
- **Per-poster rate limits** prevent one account from flooding the timeline.
- **Time-relevant expiry** for commercial posts (a Sunday-6am ride, a "ready 6–9pm" meal): they can resurface near their active time and auto-drop when sold out or expired.
- An inline composer prompt ("What's happening on campus?") opens a **post-type chooser** → a type-specific form. Listings are just post types with extra fields plus an action button, so every listing is born in the feed and the feed is shoppable. Autofill the user's saved Venmo handle into listing forms.
- Each card renders by type with its own action (Order / Book seat / Buy / Tip) and shows the author's trust tag.
- (Future, not now: a paid "Boost" to pin a post higher — design data so it can be added later.)

---

## 5. Food + chain of custody

Listing: photo, title, description, price, prep/availability window, pickup location, dietary tags, quantity (auto-closes when sold out), pickup and/or delivery, optional delivery fee.

Ordering: buyer chooses pickup or delivery; show a price breakdown; "Place order." Pickup is the simple one-leg case (seller confirms). Delivery triggers the rider flow and a **chain-of-custody order tracker** — a vertical stepper the buyer watches in real time:

1. Order placed
2. Seller accepts & cooking (sets ready time)
3. Rider claimed (first nearby online rider to accept gets it)
4. **Handoff — the pivot (highlight in amber):** seller and rider BOTH confirm the food changed hands; `orders.custody` flips to `rider`. The seller's responsibility ends here, so the seller is now guaranteed payment regardless of what the rider does next.
5. In transit
6. Delivered (buyer confirms receipt)
7. Both parties mark paid → order completes.

Each custody transfer is a two-sided confirmation, which is what makes responsibility unambiguous in disputes. Payments are external and three-way for delivery (buyer pays seller for food, buyer pays rider for delivery).

---

## 6. Rides (two modes)

- **Instant:** rider enters pickup + dropoff → a map shows nearby *online* drivers as pins → the rider taps ONE specific driver → only that driver is notified, with a 90-second window to accept before it rolls to the next. Do NOT broadcast one request to all drivers (that causes multiple-acceptance chaos). On accept, a chat opens and the driver's live location is visible to the rider until pickup.
- **Scheduled:** drivers post rides in advance (route, time, seats, price); these appear as feed/listing items and riders book seats. Ideal for airport runs, Costco trips, weekend trips.
- **Driver mode:** a "go online" toggle that shares live location *only while online*, plus an optional "accept food deliveries" toggle so drivers can pick up nearby food orders while out.

---

## 7. Sales + accommodations

Standard marketplace: photo, condition, price, category (furniture / electronics / books / kitchen / clothing), pickup location, message-the-seller. **Accommodations** is a category for subleases, room-wanted, and roommate searches, rendered as **information-only** listings with a visible "Info only — arrange lease directly" banner. Do not implement deposits, lease contracts, or any handling of housing money — it is a bulletin board, and that banner is the legal shield.

---

## 8. Wallet (a record, not money)

Not a real balance, no crypto, nothing withdrawable. It is a transaction log: net for the period, a **Pending payments** section where each item has a "Mark as paid" button (which sets the current user's paid flag — order completes when both sides have marked it), and a **Completed** list of past transactions color-coded by service. Because money moves externally and both sides confirm, this also gives you a dispute paper trail.

---

## 9. Profile

The screen that makes the account feel worth keeping. Includes: avatar/name + trust tags + a "Verify UB" call-to-action; a progress-style "Complete your profile" card for anonymous users (phone ✓, avatar ✓, then verify-UB and add-name/photo as the open items); reputation stats (rating, orders, rides, no-shows); a "tags you can earn" strip; sections for the user's own posts, saved/bookmarked listings, and events they marked interested; and Settings (verify UB email, edit identity, payment handles, invite friends, notifications, privacy & blocked users, log out). Include **Invite friends** prominently — referrals are the cheapest fix for the empty-feed cold-start problem.

---

## 10. Messaging, notifications, moderation, safety

- **Messaging:** 1:1 chat between users, tied to a listing for context; quick-reply chips for rides ("I'm here").
- **Notifications:** in-app list + unread bell badge, powered by realtime subscriptions. Triggers: new order, order state change, new message, ride accepted, someone interested in your event, a followed seller posts.
- **Moderation:** a report button on every post and profile; a few reports auto-hide a post pending admin review (visible in an admin/dashboard queue). One stated hard rule: no posting identifiable people without consent.
- **In-person safety:** share-trip link for rides, a "meet in a public spot" nudge for first exchanges, and the report button everywhere. Drivers (who travel to others) are encouraged toward UB verification even though it isn't required.
- **Liability:** a one-screen Terms of Service at signup stating plainly that the platform connects students and is not a transportation or food-service company, and that people transact at their own judgment.

---

## 11. Tech stack (do not swap without asking)

Next.js 14 (App Router) + TypeScript · Supabase (Postgres + phone-OTP Auth + Realtime + Storage) · Tailwind CSS · lucide-react icons · deploy on Vercel. Everything fits free tiers at campus scale. Use Supabase Row Level Security so users can only read/write their own private data while public posts are world-readable. Never use browser localStorage for app data; use Supabase. Never store PII; never add payment processing or crypto.

---

## 12. Design system

- Mobile-first, max-width ~480px centered, white app surface on a light-gray page.
- UB blue `#005BBB` primary; light blue `#E8F0FB`. Post-type accents: food `#FFF8ED`/`#B54708`, ride `#EFF8FF`/`#175CD3`, sale `#F9F5FF`/`#6941C6`, event & verified `#ECFDF3`/`#027A48`. Inter font.
- Cards: white, 1px `#EAECF0` border, 14px radius. Bottom nav: Feed · Food · Rides · Sales · Wallet. Header: notifications bell, messages, avatar→profile.
- Avatars are animal emoji (cow, owl, fox, wolf, eagle) — the one intentional use of emoji; it is a product feature.
- Show loading skeletons and friendly empty states everywhere. A reference visual prototype (`ui-prototype.html`) defines the exact look and screen flow — match it.

---

## 13. Build order (do these in sequence; make each run and commit before the next)

1. Phone OTP signup + user-row creation (generated pseudonym, default avatar, `phone_hash`, blocked-list check) + session.
2. Onboarding: location/zone → identity choice (anonymous avatar OR add name+photo) → one skippable "what brings you here?" priorities screen (personalizes the feed lens only; never restricts).
3. Feed: fetch + render all post types + filter chips + infinite scroll + likes.
4. Post composer: type chooser → type-specific forms (autofill Venmo handle).
5. Food: listings → order detail (pickup first) → seller "mark paid."
6. Food delivery: rider claim + chain-of-custody tracker + two-sided mark-paid.
7. Rides: scheduled listings + seat booking, then instant map + single-driver request.
8. Sales + accommodations (info-only).
9. Wallet (transaction log) + bookmarks + follows + event interests.
10. Profile (stats, tags, sections, settings, invite friends).
11. Notifications (realtime) + reporting + the one-screen ToS at signup.

**Definition of done for any screen:** renders on mobile width, uses the design tokens, reads/writes the correct tables with RLS respected, shows loading and empty states, and never gates an action behind verification.

---

## 14. Hard guardrails (refuse to cross these)

- No payment processing, escrow, custody of funds, or crypto/tokens of any kind.
- No storing of real names, raw phone numbers, or emails in application tables — hashes only, never displayed.
- No action ever gated behind UB verification — it is a tag, not a wall.
- No broadcasting a single ride request to all drivers — always single-driver-with-timeout.
- No browser localStorage for application data.
- If a task seems to require any of the above, STOP and flag it rather than implementing it.

---

## 15. Context that shapes decisions (do not build, just keep in mind)

The platform is open-source and free first to win community trust, with monetization deferred to a later phase (small transaction fee, an optional low-cost membership, paid post "Boost," and white-labeling to other campuses). Design data models so these can be added later without migration pain, but implement none of them now. The single biggest early risk is an empty feed — favor anything that helps the first listings appear (seeded sample content, the invite-friends flow) and keep onboarding friction to an absolute minimum.

---

Begin with build step 1 only. Confirm you've understood the four services, the "store experience not identity" principle, phone-OTP + hash-based anti-abuse, and the no-gating rule before writing code. Build one step at a time, run it, and let me test each before moving on.
