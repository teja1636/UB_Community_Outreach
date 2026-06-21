-- ============================================================
-- UB COMMUNITY — DATABASE SCHEMA (final)
-- Phone-OTP auth · no gating · verification is a trust tag
-- Run this whole file in Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- Philosophy: we store EXPERIENCE (reputation, posts, prefs),
-- never IDENTITY. Phone is handled by Supabase Auth for OTP;
-- our tables keep only a one-way HASH for uniqueness, never the
-- raw number, and never display it.
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  auth_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity (everything past display_name is optional)
  display_name    TEXT NOT NULL,            -- "Buffalo #4821" or chosen name
  real_name       TEXT,                     -- only if user opts to add one
  photo_url       TEXT,                     -- only if user opts to add one
  avatar_emoji    TEXT DEFAULT '🐃',

  -- Sybil defense — hashes only, never the raw value
  phone_hash      TEXT UNIQUE,              -- one phone = one account
  ub_email_hash   TEXT UNIQUE,              -- one @buffalo.edu = one verified account

  -- Trust state (tags, NOT gates — everyone can do everything)
  is_ub_verified  BOOLEAN DEFAULT FALSE,
  is_anonymous    BOOLEAN DEFAULT TRUE,     -- false once real_name/photo added
  is_banned       BOOLEAN DEFAULT FALSE,

  -- Onboarding personalization (does NOT restrict anything)
  priorities      TEXT[] DEFAULT '{}',      -- ['rides','sell_food','browse']
  location_zone   TEXT,                     -- 'north_campus' | 'south_campus' | 'off_campus'

  -- Payment handles (external payments) — autofilled into listings
  venmo_handle    TEXT,
  cashapp_handle  TEXT,

  -- Reputation (the "experience" we store)
  rating          DECIMAL(3,2) DEFAULT 5.00,
  rating_count    INTEGER DEFAULT 0,
  total_orders    INTEGER DEFAULT 0,
  total_rides     INTEGER DEFAULT 0,
  no_shows        INTEGER DEFAULT 0,
  earned_tags     TEXT[] DEFAULT '{}'       -- ['trusted_seller','top_rider','quick_replier']
);

-- Ban enforcement without storing identity: when a user is banned,
-- copy their hashes here so a new signup with the same phone/email is blocked.
CREATE TABLE blocked_identifiers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  hash        TEXT NOT NULL,
  hash_type   TEXT CHECK (hash_type IN ('phone', 'ub_email')),
  reason      TEXT
);
CREATE INDEX idx_blocked_hash ON blocked_identifiers(hash);

-- ============================================================
-- POSTS — the feed. Food / ride / sale / event / community.
-- ============================================================
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,

  type            TEXT NOT NULL CHECK (type IN ('food','ride','sale','event','community')),
  title           TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,

  location_zone   TEXT,
  location_label  TEXT,                     -- "Ellicott complex"

  status          TEXT DEFAULT 'active' CHECK (status IN ('active','sold','completed','cancelled','expired')),
  expires_at      TIMESTAMPTZ,

  like_count      INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0
);
CREATE INDEX idx_posts_feed ON posts(status, created_at DESC);
CREATE INDEX idx_posts_type ON posts(type, created_at DESC);

-- ----- Type-specific detail tables -----
CREATE TABLE food_listings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id            UUID REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  price              DECIMAL(10,2) NOT NULL,
  pickup_available   BOOLEAN DEFAULT TRUE,
  delivery_available BOOLEAN DEFAULT FALSE,
  delivery_fee       DECIMAL(10,2),
  quantity_total     INTEGER DEFAULT 1,
  quantity_remaining INTEGER DEFAULT 1,
  available_from     TIMESTAMPTZ,
  available_until    TIMESTAMPTZ,
  dietary_tags       TEXT[] DEFAULT '{}'
);

CREATE TABLE ride_listings (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id                UUID REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  pickup_label           TEXT NOT NULL,
  dropoff_label          TEXT NOT NULL,
  departure_time         TIMESTAMPTZ NOT NULL,
  estimated_minutes      INTEGER,
  seats_total            INTEGER DEFAULT 1,
  seats_remaining        INTEGER DEFAULT 1,
  price_per_seat         DECIMAL(10,2) NOT NULL,
  vehicle_description    TEXT,
  accepts_food_delivery  BOOLEAN DEFAULT FALSE,
  ride_mode              TEXT DEFAULT 'scheduled' CHECK (ride_mode IN ('scheduled','instant'))
);

CREATE TABLE sale_listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id         UUID REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  price           DECIMAL(10,2),
  condition       TEXT CHECK (condition IN ('new','like_new','good','fair','parts')),
  category        TEXT,                     -- furniture | electronics | books | kitchen | clothing | accommodation
  pickup_label    TEXT,
  -- accommodations sub-type (info-only listings)
  is_accommodation     BOOLEAN DEFAULT FALSE,
  accommodation_type   TEXT CHECK (accommodation_type IN ('sublease','room_wanted','roommate')),
  lease_price_monthly  DECIMAL(10,2),
  lease_from           DATE,
  lease_until          DATE
);

CREATE TABLE event_listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  event_time    TIMESTAMPTZ,
  event_location TEXT,
  interested_count INTEGER DEFAULT 0
);

-- ============================================================
-- ORDERS — payments are EXTERNAL. Platform tracks, never holds.
-- Two-sided confirmation closes the dispute gap.
-- ============================================================
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  buyer_id         UUID REFERENCES users(id),
  seller_id        UUID REFERENCES users(id),
  rider_id         UUID REFERENCES users(id),   -- set when food delivery
  post_id          UUID REFERENCES posts(id),

  order_type       TEXT NOT NULL CHECK (order_type IN ('food','ride','sale')),
  amount           DECIMAL(10,2) NOT NULL,
  delivery_fee     DECIMAL(10,2) DEFAULT 0,
  fulfillment      TEXT CHECK (fulfillment IN ('pickup','delivery')),

  -- Chain of custody (food delivery)
  custody          TEXT DEFAULT 'seller' CHECK (custody IN ('seller','rider','buyer')),

  -- External payment, both sides confirm
  payment_method   TEXT,                        -- 'venmo' | 'cashapp' | 'cash'
  buyer_marked_paid   BOOLEAN DEFAULT FALSE,
  seller_marked_paid  BOOLEAN DEFAULT FALSE,
  payment_note     TEXT,

  status           TEXT DEFAULT 'pending' CHECK (
    status IN ('pending','accepted','rider_assigned','in_transit','delivered','completed','cancelled','disputed')
  ),
  accepted_at      TIMESTAMPTZ,
  handoff_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);
CREATE INDEX idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, created_at DESC);

-- ============================================================
-- ENGAGEMENT & SOCIAL
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id         UUID REFERENCES posts(id),
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  conversation_id TEXT GENERATED ALWAYS AS (
    CASE WHEN sender_id < receiver_id
      THEN sender_id::TEXT || '_' || receiver_id::TEXT
      ELSE receiver_id::TEXT || '_' || sender_id::TEXT END
  ) STORED
);
CREATE INDEX idx_messages_convo ON messages(conversation_id, created_at);

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, followed_id)
);

CREATE TABLE event_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- 'order','message','ride','event','system'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                     -- in-app route to open
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reporter_id UUID REFERENCES users(id),
  post_id UUID REFERENCES posts(id),
  reported_user_id UUID REFERENCES users(id),
  reason TEXT NOT NULL CHECK (reason IN ('spam','scam','inappropriate','wrong_info','safety','other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed'))
);

-- ============================================================
-- ADMIN VIEW
-- ============================================================
CREATE VIEW admin_stats AS SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM users WHERE is_ub_verified) AS verified_users,
  (SELECT COUNT(*) FROM posts WHERE status='active') AS active_posts,
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT COUNT(*) FROM orders WHERE status='completed') AS completed_orders,
  (SELECT COALESCE(SUM(amount),0) FROM orders WHERE status='completed') AS total_volume,
  (SELECT COUNT(*) FROM reports WHERE status='pending') AS pending_reports;

-- ============================================================
-- TRIGGERS — counters & timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER t_posts_updated  BEFORE UPDATE ON posts  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION bump_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE posts SET like_count=like_count+1 WHERE id=NEW.post_id;
  ELSIF TG_OP='DELETE' THEN UPDATE posts SET like_count=GREATEST(0,like_count-1) WHERE id=OLD.post_id; END IF;
  RETURN NULL; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER t_like_count AFTER INSERT OR DELETE ON likes FOR EACH ROW EXECUTE FUNCTION bump_like_count();

-- When both sides confirm payment, complete the order.
CREATE OR REPLACE FUNCTION complete_when_paid() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_marked_paid AND NEW.seller_marked_paid AND NEW.status <> 'completed' THEN
    NEW.status := 'completed'; NEW.completed_at := NOW();
  END IF;
  RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER t_complete_paid BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION complete_when_paid();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_users_read   ON users  FOR SELECT USING (TRUE);
CREATE POLICY p_users_write  ON users  FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY p_posts_read   ON posts  FOR SELECT USING (TRUE);
CREATE POLICY p_posts_write  ON posts  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
CREATE POLICY p_orders_read  ON orders FOR SELECT USING (
  auth.uid() IN (SELECT auth_id FROM users WHERE id IN (buyer_id, seller_id, rider_id)));
CREATE POLICY p_orders_write ON orders FOR ALL USING (
  auth.uid() IN (SELECT auth_id FROM users WHERE id IN (buyer_id, seller_id, rider_id)));
CREATE POLICY p_msg_read     ON messages FOR SELECT USING (
  auth.uid() IN (SELECT auth_id FROM users WHERE id IN (sender_id, receiver_id)));
CREATE POLICY p_msg_write    ON messages FOR INSERT WITH CHECK (
  auth.uid() = (SELECT auth_id FROM users WHERE id = sender_id));
CREATE POLICY p_bm           ON bookmarks FOR ALL USING (
  auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
CREATE POLICY p_notif        ON notifications FOR SELECT USING (
  auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- ============================================================
-- SEED DATA (for local testing; auth_id NULL is fine here)
-- ============================================================
INSERT INTO users (display_name, avatar_emoji, is_ub_verified, is_anonymous) VALUES
('spicy_kitchen_22','👩',TRUE,FALSE),
('northwind_rides','🧑',TRUE,FALSE),
('Wolf #2219','🐺',FALSE,TRUE),
('Night Owl #318','🦉',FALSE,TRUE);

INSERT INTO posts (user_id, type, title, description, location_zone, location_label)
VALUES ((SELECT id FROM users WHERE display_name='spicy_kitchen_22'),'food',
  'Homemade chicken biryani','Fragrant basmati, spiced chicken, raita included.',
  'north_campus','Ellicott complex');
INSERT INTO food_listings (post_id, price, pickup_available, delivery_available, delivery_fee, quantity_total, quantity_remaining, available_until, dietary_tags)
VALUES ((SELECT id FROM posts WHERE title='Homemade chicken biryani'),7.00,TRUE,TRUE,2.00,10,8,NOW()+INTERVAL '3 hours','{"halal"}');

INSERT INTO posts (user_id, type, title, description, location_zone, location_label)
VALUES ((SELECT id FROM users WHERE display_name='northwind_rides'),'ride',
  'North campus → Buffalo airport','Toyota Camry, room for luggage.','north_campus','Ring Rd south gate');
INSERT INTO ride_listings (post_id, pickup_label, dropoff_label, departure_time, seats_total, seats_remaining, price_per_seat, vehicle_description)
VALUES ((SELECT id FROM posts WHERE title='North campus → Buffalo airport'),
  'North campus · Ring Rd','Buffalo airport (BUF)',NOW()+INTERVAL '2 days',3,2,12.00,'Toyota Camry');

INSERT INTO posts (user_id, type, title, description, location_zone, location_label)
VALUES ((SELECT id FROM users WHERE display_name='Night Owl #318'),'sale',
  '1BR sublease · Ellicott','Furnished, May–Aug, near North campus.','north_campus','Ellicott complex');
INSERT INTO sale_listings (post_id, condition, category, is_accommodation, accommodation_type, lease_price_monthly)
VALUES ((SELECT id FROM posts WHERE title='1BR sublease · Ellicott'),'good','accommodation',TRUE,'sublease',650.00);

INSERT INTO posts (user_id, type, title, description, location_zone, location_label)
VALUES ((SELECT id FROM users WHERE display_name='Wolf #2219'),'community',
  'Snow day — North Campus buried right now','Classes cancelled, quad looks unreal.','north_campus','North Campus');

-- ============================================================
-- ADDITIONS (app build) — chain-of-custody, claim RPC, and
-- notification triggers. Safe to run on top of the base schema.
-- ============================================================

-- Two-sided handoff confirmation for food delivery.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_confirmed_handoff BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_confirmed_handoff  BOOLEAN DEFAULT FALSE;

-- When BOTH seller and rider confirm the handoff, custody flips to the rider
-- and the order moves to in_transit. The seller is now guaranteed payment.
CREATE OR REPLACE FUNCTION handle_handoff() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seller_confirmed_handoff AND NEW.rider_confirmed_handoff AND NEW.custody <> 'rider' THEN
    NEW.custody := 'rider';
    NEW.status := 'in_transit';
    NEW.handoff_at := NOW();
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS t_handoff ON orders;
CREATE TRIGGER t_handoff BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION handle_handoff();

-- A nearby rider claims a delivery. SECURITY DEFINER so a user who is not yet
-- a party to the order can atomically attach themselves as the rider.
CREATE OR REPLACE FUNCTION claim_delivery(p_order_id UUID) RETURNS orders AS $$
DECLARE me UUID; result orders;
BEGIN
  SELECT id INTO me FROM users WHERE auth_id = auth.uid();
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE orders
     SET rider_id = me, status = 'rider_assigned'
   WHERE id = p_order_id AND rider_id IS NULL AND fulfillment = 'delivery'
   RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'cannot_claim'; END IF;
  RETURN result;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----- Notification triggers (SECURITY DEFINER to bypass RLS) -----
CREATE OR REPLACE FUNCTION notify_new_order() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications(user_id, type, title, body, link)
  VALUES (NEW.seller_id, 'order', 'New order',
          'You have a new ' || NEW.order_type || ' order', '/orders/' || NEW.id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS t_notify_order ON orders;
CREATE TRIGGER t_notify_order AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION notify_new_order();

CREATE OR REPLACE FUNCTION notify_order_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notifications(user_id, type, title, body, link)
    VALUES (NEW.buyer_id, 'order', 'Order update',
            'Your order is now ' || NEW.status, '/orders/' || NEW.id);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS t_notify_order_status ON orders;
CREATE TRIGGER t_notify_order_status AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION notify_order_status();

CREATE OR REPLACE FUNCTION notify_new_message() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications(user_id, type, title, body, link)
  VALUES (NEW.receiver_id, 'message', 'New message', LEFT(NEW.content, 60), '/messages');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS t_notify_message ON messages;
CREATE TRIGGER t_notify_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Allow realtime streaming of notifications and messages to clients.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- UB email verification codes (one row per user, replaced on each request).
-- Stores only the email HASH plus a short-lived code — never the raw email.
CREATE TABLE IF NOT EXISTS ub_verifications (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_hash  TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
