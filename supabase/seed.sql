-- ============================================================
-- UB COMMUNITY — SEED DATA
-- Runs ONLY on `supabase db reset` and preview branches, never on
-- the production database (see config.toml [db.seed]). auth_id is
-- NULL here, which is fine for browsing the feed locally.
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
