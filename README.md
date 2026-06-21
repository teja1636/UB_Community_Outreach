# UB Community 🐃

A free, open-source campus platform for University at Buffalo students.
**Rides · Food · Move-out sales · Campus feed.**

Built by students, for students. No fees, no middleman. Payments happen directly between people — the platform just connects you and remembers your reputation.

> We're not storing your identity. We're storing your experience.

---

## What it does

- **Feed** — a chronological campus feed mixing food, rides, sales, events, and posts. Anyone can browse and post.
- **Food** — sell homemade food; buyers choose pickup or delivery by a nearby student rider.
- **Rides** — offer or request rides; book seats on scheduled trips or hail a nearby driver on a map.
- **Sales** — move-out items, plus an accommodations section for subleases and roommates (info only).

## How it's different

- **Anonymous by default.** Sign up with a phone number, pick an animal avatar, and you're in as e.g. "Buffalo #4821." Add a real name/photo later only if you want to.
- **No personal data stored.** We keep your reputation, posts, and saved items — never your name, raw phone number, or email. Signup uses a one-way hash so one phone = one account, without us holding the number.
- **Everyone can do everything.** Selling, driving, and posting are open to all. Verifying your @buffalo.edu email earns a trust badge — it's a bonus, never a requirement.
- **Payments are external.** Pay with Venmo, Cash App, or cash. The app records the transaction; it never touches your money. (No crypto.)

## Tech stack

Next.js 14 · TypeScript · Supabase (Postgres + phone-OTP auth + Realtime) · Tailwind CSS · deployed on Vercel. **Cost to run at campus scale: $0.**

## Get started

New here? Read **`GETTING-STARTED.md`** — it walks you through setup and building with Claude Code, step by step.

Quick version:
1. `npm install`
2. Create a Supabase project, run `supabase-schema.sql` in its SQL editor, enable phone auth.
3. `cp .env.local.example .env.local` and fill in your Supabase keys + a `HASH_PEPPER`.
4. `npm run dev` → http://localhost:3000

Building with Claude Code? It reads **`CLAUDE.md`** automatically — that file contains the full spec, principles, data model, and build order.

## Project structure

```
ub-community/
├── CLAUDE.md             # project brain — Claude Code reads this first
├── GETTING-STARTED.md    # setup + how to build, step by step
├── supabase-schema.sql   # run once in Supabase to create the database
├── .env.local.example    # copy to .env.local, fill in
└── src/
    ├── app/              # pages (App Router): feed, food, rides, sales, wallet, profile…
    ├── components/       # ui (nav, badges, tags), feed (post card, composer)…
    └── lib/supabase.ts   # database client + TypeScript types
```

## How payments work

There is no payment processing — intentionally. A buyer sees the seller's Venmo handle and pays directly. Both sides then tap "mark as paid"; when both confirm, the order completes. This keeps the app free to run and out of financial-regulation territory.

## Contributing

UB student who codes? PRs welcome. Good first issues: image uploads (Supabase Storage), search across post types, the notifications list, a map view for rides. Keep to the principles in `CLAUDE.md` — especially: no PII storage, no gating, no payment processing.

## License

MIT. Free to use, modify, and run at your own campus. A star or mention is appreciated.

Built at University at Buffalo. Go Bulls. 🐃
