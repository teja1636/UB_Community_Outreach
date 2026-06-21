# Getting started — building UB Community with Claude Code

This is the fastest, least-painful path from zero to a running app. Follow it in order.

## Before you touch Claude Code (about 20 minutes, do this yourself)

These three setup steps are quick and clear — doing them by hand first means Claude Code can start on real features instead of fighting setup.

### 1. Install the tools
- Install Node.js 18+  → https://nodejs.org
- Install Claude Code → `npm install -g @anthropic-ai/claude-code`

### 2. Create your Supabase project
1. Sign up at https://supabase.com → New project (name it `ub-community`, US East region).
2. Apply the database schema — pick ONE:
   - **Automatic via GitHub (recommended):** In the Supabase dashboard → **Settings → Integrations → GitHub**, connect this repo and select your branch. Supabase then applies `supabase/migrations/*.sql` automatically on every push — no copy-paste, and future schema changes ship the same way. The initial schema is `supabase/migrations/20260621000000_initial_schema.sql`; sample rows live in `supabase/seed.sql` (preview branches only, never prod).
   - **Manual one-time:** SQL Editor → New query → paste ALL of `supabase-schema.sql` → Run. You should see "Success" and sample data appears in Table Editor.
3. Turn on phone auth: Authentication → Providers → Phone → enable. Supabase needs an SMS provider (Twilio is the usual choice — free trial works for testing). Add your Twilio keys in that screen. (For pure local testing you can temporarily enable email OTP instead and switch to phone before launch.)

### 3. Wire up env vars
1. In this project folder: `cp .env.local.example .env.local`
2. In Supabase → Settings → API, copy the Project URL and the `anon` key into `.env.local`.
3. Add a secret pepper for hashing: open `.env.local` and set `HASH_PEPPER` to any long random string (used server-side to hash phone numbers). Never commit this file.
4. Also copy the **service_role** key (Supabase → Settings → API) into `SUPABASE_SERVICE_ROLE_KEY`. It is used server-side only — to create user rows with a server-side phone hash and to check the blocked list. Never expose it to the browser or commit it.

Now you have a database, auth, and a configured project. Time to build.

## Working with Claude Code effectively

Open a terminal in the project folder and run:

```bash
claude
```

Claude Code automatically reads `CLAUDE.md` — that file carries every decision we made, so you don't have to re-explain the project each session.

### The golden rules for good results

1. **Build one screen at a time, in the order listed in `CLAUDE.md` ("Build order").** Don't ask for the whole app at once — you'll get something shallow and hard to debug. One feature per session, test it, commit, move on.
2. **Make it run after every feature.** Ask Claude Code to start the dev server (`npm run dev`) and confirm the screen works at http://localhost:3000 before adding the next.
3. **Commit working states.** After each feature works: `git add . && git commit -m "..."`. This gives you a safe point to roll back to.
4. **When something breaks, paste the exact error.** Claude Code fixes errors far faster from the real message than from "it's broken."
5. **Hold the line on the principles.** If Claude Code ever proposes payment processing, crypto, storing real phone numbers/emails, or gating actions behind verification — stop it and point at `CLAUDE.md`. Those are the things that quietly wreck this project.

### Your first prompt (paste this into Claude Code)

```
Read CLAUDE.md and supabase-schema.sql in full. Then confirm you understand:
the four services, phone-OTP signup, the "store experience not identity"
principle, and that verification is a trust tag (not a gate).

Then do step 1 of the build order only: phone OTP signup. Build the welcome
screen with the tagline, a phone-number entry screen, an OTP code screen using
Supabase Auth phone OTP, and the logic that creates a users row on first login
(generated "Buffalo #" pseudonym, default avatar, phone_hash = sha256(phone +
HASH_PEPPER), checking blocked_identifiers first). Then run the dev server so I
can test it. Do not build any other screens yet.
```

### Good follow-up prompts (one per session, in order)

- `Now build step 2: the onboarding flow — location/zone, identity choice (anonymous avatar OR add name+photo), and the one-screen skippable priorities question. Save zone and priorities to the users row.`
- `Now build step 3: the feed. Chronological newest-first, infinite scroll, filter chips, and render each post type as its own card with the right action button. Pull from posts with the joined detail tables.`
- `Now build step 4: the post composer — type chooser then a type-specific form, autofilling the saved Venmo handle.`
- ...continue down the build order in CLAUDE.md, one step per session.

### When you want to deploy

```
Help me deploy to Vercel: run vercel, set the same env vars from .env.local in
the Vercel dashboard, and give me the live URL.
```

## A sane first-week plan

- Day 1: setup (above) + step 1 (auth) working and deployed.
- Day 2–3: onboarding + feed.
- Day 4: post composer + food listings (pickup only).
- Day 5: food delivery + order tracking.
- Weekend: rides.
- Following week: sales, wallet, profile, notifications.

Ship the link to ~10 friends after the feed + food work. Real feedback beats more features.

## If you get stuck

- Schema problems → re-run `supabase-schema.sql` (it's safe to drop the tables and re-run during development).
- Auth not sending codes → check the SMS provider keys in Supabase Auth settings.
- Anything else → paste the exact error into Claude Code.
