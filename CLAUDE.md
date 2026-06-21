# CLAUDE.md — project guide for Claude Code

This file is your source of truth for building UB Community. Read it fully before writing code. When a decision here conflicts with a default assumption, this file wins.

## What we're building

A free, open-source campus platform for University at Buffalo students. Four things in one app:
- **Feed** — chronological, blended stream of food, rides, sales, events, and community posts.
- **Food** — students sell homemade food; buyers pick up or get it delivered by a nearby rider.
- **Rides** — students offer/request rides (scheduled listings + instant map-based requests).
- **Sales** — move-out items + accommodations (subleases/roommates, info-only).

Mobile-first web app. Feels like a normal consumer app. The blockchain/crypto ideas are NOT in this build — payments are external (Venmo/Cash App/cash); the platform only *records* them.

## Non-negotiable principles

1. **Store experience, not identity.** We keep reputation, posts, bookmarks, preferences. We do NOT store names, raw phone numbers, or emails in our tables. The home screen literally says: "We're not storing your identity, we're storing your experience."
2. **Phone OTP is the signup + Sybil defense.** Use Supabase Auth phone OTP. Supabase Auth holds the phone number for OTP delivery only. In OUR `users` table we store `phone_hash` (a one-way hash) for one-account-per-phone — never the raw number, never displayed.
3. **No gating.** ANY signed-up user can sell food, drive, post, and list items. UB verification is a TRUST TAG, not a permission gate. Never block an action behind `is_ub_verified`.
4. **Verification = trust accelerator.** Verifying @buffalo.edu sets `is_ub_verified=true` and stores only `ub_email_hash` (one-way) to enforce one-verified-account-per-student. Nudge users toward it ("verified sellers get more orders") but never require it.
5. **Anonymity is the default and is reversible.** Users enter with an avatar + pseudonym ("Buffalo #4821"). They MAY optionally add a real name/photo later. Adding one flips `is_anonymous=false`.
6. **Payments are external.** Never build payment processing, escrow, or crypto. Orders are tracked records. Completion needs BOTH `buyer_marked_paid` and `seller_marked_paid` (a trigger auto-completes the order when both are true).

## Tech stack (do not swap without asking)

- Next.js 14 (App Router) + TypeScript
- Supabase (Postgres + Auth phone OTP + Realtime + Storage)
- Tailwind CSS
- lucide-react for icons
- Deploy on Vercel

## Visual design system

- Primary color: UB blue `#005BBB`. Light blue `#E8F0FB`.
- Post-type accents: food `#FFF8ED`/`#B54708`, ride `#EFF8FF`/`#175CD3`, sale `#F9F5FF`/`#6941C6`, event/verified `#ECFDF3`/`#027A48`.
- Font: Inter. Mobile container max-width 480px, centered, white app surface on a light-gray page.
- Cards: white, 1px `#EAECF0` border, 14px radius, 14px padding.
- Bottom nav: Feed - Food - Rides - Sales - Wallet. Header: bell (notifications), messages, avatar->profile.
- Reusable styles exist in `src/app/globals.css` (.card, .btn, .btn-primary, .chip, .bottom-nav, etc.). Use them; don't reinvent.
- Avatars are animal emoji (cow, owl, fox, wolf, eagle) — intentional product feature, the only place emoji are used.

## Trust tags (show next to a pseudonym)

- `anonymous` (gray) — default
- `UB verified` (green check) — verified @buffalo.edu
- `new member` (blue) — joined < 7 days; a gentle "be a little careful" signal, not a penalty
- Earned, stored in `users.earned_tags`: `trusted_seller` (10+ orders, 4.5+), `top_rider` (10+ rides, 4.5+), `quick_replier`
- If a user adds a real name/photo, show the photo instead of the avatar

## Screen-by-screen spec (the complete UI)

Onboarding (one quick flow, steps skippable where noted):
1. **Welcome** — UB logo, tagline "We're not storing your identity, we're storing your experience." Primary action: "Sign up with phone." Phone entry -> OTP code -> verified.
2. **Location** — location access OR pick a zone manually (North / South / Off campus). Store zone only.
3. **Identity choice** — (a) stay anonymous: pick an avatar; or (b) add a name + photo. Either continues.
4. **Priorities** (skippable, ONE screen) — "What brings you here?": Rides / Sell food / Browse-not sure yet. Sets the default feed lens ONLY. Never restricts anything.
5. -> Feed.

Main app:
- **Feed** — chronological (newest first), infinite scroll. Filter chips: All/Food/Rides/Sales/Events. Inline composer prompt -> post-type chooser. Each card renders by type with its own action (Order / Book seat / Buy / Tip). Trust tag on every author.
- **Post composer** — choose type, then a type-specific form. Autofill the user's saved Venmo handle.
- **Food** — listings with ratings, quantity-remaining, dietary chips, pickup/delivery. Tap -> order detail (pickup vs delivery toggle, price breakdown, Place order). Delivery triggers the rider flow.
- **Order tracking (chain of custody)** — vertical stepper: placed -> seller cooking -> rider claimed -> HANDOFF (pivot; seller + rider both confirm; `custody` flips to rider) -> in transit -> delivered (buyer confirms) -> both mark paid -> completed. Highlight handoff in amber.
- **Rides** — two modes. (1) Instant: enter pickup/dropoff -> map with nearby online drivers pinned -> tap ONE driver -> only that driver is notified, 90s to accept (no broadcast-to-all). (2) Scheduled: browse listings, book a seat. Driver "go online" toggle shares live location only while online; optional accept-food-deliveries toggle.
- **Sales** — category chips incl. Accommodations. Item cards (photo, condition, price, message). Accommodation listings are INFO-ONLY: show "Info only - arrange lease directly" banner; no deposits/contracts.
- **Wallet** — NOT money. A transaction log: net this period, Pending payments (each with a "Mark as paid" button -> sets the current user's paid flag), Completed list. No crypto, no withdrawable balance.
- **Messages + chat** — thread list -> conversation. Quick replies for rides.
- **Profile** — avatar/name + trust tags + "Verify UB" CTA; "Complete your profile" progress card for anonymous users; reputation stats (rating, orders, rides, no-shows); "tags you can earn"; sections for Your posts, Saved/bookmarks, Interested events; Settings (verify UB, edit identity, payment handles, invite friends, notifications, privacy & blocked users, log out).
- **Notifications** — in-app list + unread badge on the bell, via Supabase Realtime. Triggers: new order, order state change, new message, ride accepted, event interest, followed seller posts.

## Data model

See `supabase-schema.sql` (run it in Supabase first). Key tables: `users`, `posts` (+ type detail tables), `orders`, `messages`, `likes`, `bookmarks`, `follows`, `event_interests`, `notifications`, `reports`, `blocked_identifiers`. Types mirrored in `src/lib/supabase.ts`.

## Auth + Sybil logic (build carefully)

- Signup: Supabase phone OTP. On first success, create a `users` row: generated `display_name` ("Buffalo #" + random), default avatar, `phone_hash = sha256(phone + PEPPER)`. PEPPER is a server-side env var only.
- Before creating a user, check `blocked_identifiers` for the phone_hash; if present, refuse.
- UB verify: send a 6-digit code to the entered @buffalo.edu (Supabase email OTP or an edge function). On success set `is_ub_verified=true`, store `ub_email_hash`; if that hash already exists on another user, refuse. Never store the raw email.
- If using email signup anywhere, block disposable domains with a maintained blocklist.

## Conventions

- TypeScript everywhere; avoid `any`. Components in `src/components`, pages in `src/app`.
- Small, single-purpose components. Use existing `globals.css` utilities.
- Round displayed money with `.toFixed(2)`.
- Never use browser localStorage for app data — use Supabase. (Session handled by Supabase Auth.)
- No crypto, no payment processing, no PII storage. If a task seems to need any of these, stop and flag it.

## Build order (sequence; ship each before the next)

1. Auth: phone OTP signup + user creation + session.
2. Onboarding: location -> identity choice -> priorities.
3. Feed: fetch + render post types + filters + infinite scroll + likes.
4. Post composer (all types).
5. Food: listings -> order detail (pickup first), seller "mark paid".
6. Food delivery: rider claim + chain-of-custody tracking + two-sided mark-paid.
7. Rides: scheduled listings + booking, then instant map + single-driver request.
8. Sales + accommodations.
9. Wallet (transaction log) + bookmarks/follows/event interests.
10. Profile (stats, tags, sections, settings).
11. Notifications (Realtime) + reporting.

## Definition of done for a screen

Renders on mobile width, uses the design tokens, reads/writes the right Supabase tables with RLS respected, shows loading and empty states, and never gates an action behind verification.
