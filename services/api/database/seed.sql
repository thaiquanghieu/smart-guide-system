BEGIN;

-- =========================
-- USERS
-- =========================
INSERT INTO users (
  user_name, email, password_hash, avatar_url, favorite_count, listened_poi_count
) VALUES
('hieu', 'hieu@gmail.com', '123456', '/images/avatar.png', 0, 0),
('test', 'test@gmail.com', '123456', '/images/avatar2.png', 0, 0),
('demo', 'demo@email.com', '123456', '/images/avatar.png', 0, 0)
ON CONFLICT (email) DO NOTHING;

-- =========================
-- POIS
-- =========================
INSERT INTO pois (
  id, name, category, categories, short_description, description,
  address, open_time, close_time, price_text,
  latitude, longitude, listened_count, rating_avg, rating_count
) VALUES
(
  '1',
  'Nhà thờ Đức Bà Sài Gòn',
  'Kiến trúc',
  '["Kiến trúc","Tôn giáo","Lịch sử"]'::jsonb,
  'Công trình kiến trúc biểu tượng giữa trung tâm thành phố.',
  'Nhà thờ Đức Bà Sài Gòn là một trong những công trình kiến trúc nổi bật nhất tại TP.HCM, mang phong cách Roman pha Gothic và gắn liền với lịch sử đô thị Sài Gòn.',
  '01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM',
  '08:00',
  '17:00',
  'Miễn phí',
  10.779783,
  106.699018,
  0,
  4.8,
  125
),
(
  '2',
  'Thảo Cầm Viên Sài Gòn',
  'Thiên nhiên',
  '["Thiên nhiên","Sở thú","Gia đình"]'::jsonb,
  'Một trong những sở thú lâu đời nhất Việt Nam.',
  'Thảo Cầm Viên Sài Gòn là điểm tham quan quen thuộc với nhiều thế hệ, kết hợp giữa vườn thú, không gian xanh và hoạt động vui chơi phù hợp cho gia đình.',
  '02 Nguyễn Bỉnh Khiêm, Bến Nghé, Quận 1, TP.HCM',
  '07:00',
  '17:30',
  '60.000đ',
  10.787071,
  106.705002,
  0,
  4.6,
  210
),
(
  '3',
  'Chợ Bến Thành',
  'Văn hóa',
  '["Văn hóa","Mua sắm","Ẩm thực"]'::jsonb,
  'Biểu tượng văn hóa lâu đời của Sài Gòn.',
  'Chợ Bến Thành là khu chợ nổi tiếng bậc nhất TP.HCM, nơi du khách có thể khám phá văn hóa mua sắm, ẩm thực và nhịp sống sôi động của thành phố.',
  'Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
  '06:00',
  '18:00',
  'Miễn phí',
  10.772518,
  106.698032,
  0,
  4.5,
  185
),
(
  '4',
  'Nhà của tôi',
  'Cá nhân',
  '["Cá nhân","Mốc vị trí"]'::jsonb,
  'Điểm đánh dấu vị trí nhà.',
  'Đây là vị trí nhà của tôi dùng để demo tính năng nhận diện điểm đến và phát thuyết minh tự động.',
  'Khu dân cư demo',
  '00:00',
  '23:59',
  'Miễn phí',
  10.800402183790236,
  106.6812920379377,
  0,
  5.0,
  1
),
(
  '5',
  'Nhà hàng xóm',
  'Cá nhân',
  '["Cá nhân","Mốc vị trí"]'::jsonb,
  'Điểm đánh dấu nhà hàng xóm.',
  'Đây là vị trí nhà hàng xóm dùng để demo khoảng cách gần và cơ chế tracking tự động giữa các POI.',
  'Khu dân cư demo',
  '00:00',
  '23:59',
  'Miễn phí',
  10.800284637102754,
  106.68118732980707,
  0,
  4.9,
  1
)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- POI IMAGES
-- =========================
INSERT INTO poi_images (poi_id, image_url, sort_order) VALUES
('1', '/images/pois/poi-1-1.jpg', 1),
('1', '/images/pois/poi-1-2.jpg', 2),

('2', '/images/pois/poi-2-1.jpg', 1),
('2', '/images/pois/poi-2-2.jpg', 2),

('3', '/images/pois/poi-3-1.jpg', 1),
('3', '/images/pois/poi-3-2.jpg', 2),

('4', '/images/pois/poi-4-1.jpg', 1),
('5', '/images/pois/poi-5-1.jpg', 1)
ON CONFLICT DO NOTHING;

-- =========================
-- AUDIO (VI / EN / JA / KO)
-- =========================
INSERT INTO audio_guides (
  id, poi_id, language_code, language_name, voice_name, script_text
) VALUES

-- ===== POI 1: NOTRE DAME =====
('1_vi','1','vi','Tiếng Việt','System','Nhà thờ Đức Bà Sài Gòn là công trình kiến trúc tiêu biểu của thành phố.'),
('1_en','1','en','English','System','Notre Dame Cathedral of Saigon is a famous architectural landmark in Ho Chi Minh City.'),
('1_ja','1','ja','日本語','System','サイゴンのノートルダム大聖堂は、ホーチミン市の有名な建築物です。'),
('1_ko','1','ko','한국어','System','사이공 노트르담 대성당은 호치민시의 대표적인 건축물입니다.'),

-- ===== POI 2: ZOO =====
('2_vi','2','vi','Tiếng Việt','System','Thảo Cầm Viên Sài Gòn là một trong những sở thú lâu đời nhất Việt Nam.'),
('2_en','2','en','English','System','Saigon Zoo and Botanical Gardens is one of the oldest zoos in Vietnam.'),
('2_ja','2','ja','日本語','System','サイゴン動植物園はベトナムで最も古い動物園の一つです。'),
('2_ko','2','ko','한국어','System','사이공 동물원은 베트남에서 가장 오래된 동물원 중 하나입니다.'),

-- ===== POI 3: BEN THANH =====
('3_vi','3','vi','Tiếng Việt','System','Chợ Bến Thành là biểu tượng văn hóa lâu đời của Sài Gòn.'),
('3_en','3','en','English','System','Ben Thanh Market is a long-standing cultural symbol of Saigon.'),
('3_ja','3','ja','日本語','System','ベンタイン市場はサイゴンの歴史ある文化的象徴です。'),
('3_ko','3','ko','한국어','System','벤탄 시장은 사이공의 대표적인 문화 상징입니다.'),

-- ===== POI 4: HOME =====
('4_vi','4','vi','Tiếng Việt','System','Bạn đã đến nhà của mình.'),
('4_en','4','en','English','System','You have arrived at your home.'),
('4_ja','4','ja','日本語','System','あなたの家に到着しました。'),
('4_ko','4','ko','한국어','System','당신의 집에 도착했습니다.'),

-- ===== POI 5: NEIGHBOR =====
('5_vi','5','vi','Tiếng Việt','System','Bạn đã đến nhà hàng xóm.'),
('5_en','5','en','English','System','You have arrived at your neighbor''s house.'),
('5_ja','5','ja','日本語','System','隣の家に到着しました。'),
('5_ko','5','ko','한국어','System','이웃집에 도착했습니다.')
ON CONFLICT (id) DO NOTHING;

-- =========================
-- FAVORITES
-- =========================
INSERT INTO favorites (user_id, poi_id) VALUES
(1, '1'),
(1, '2'),
(2, '3'),
(3, '4')
ON CONFLICT (user_id, poi_id) DO NOTHING;

-- =========================
-- LISTEN LOGS
-- =========================
INSERT INTO listen_logs (user_id, poi_id) VALUES
(1, '1'),
(1, '2'),
(1, '3'),
(2, '2'),
(2, '3'),
(3, '4'),
(3, '5');

-- =========================
-- RATINGS
-- =========================
INSERT INTO ratings (poi_id, user_id, rating_value) VALUES
('1', 1, 5),
('2', 1, 4),
('3', 2, 5)
ON CONFLICT (poi_id, user_id) DO NOTHING;

-- =========================
-- SUBSCRIPTIONS
-- =========================
INSERT INTO subscriptions (user_id, expire_at) VALUES
(1, NOW() + INTERVAL '7 days'),
(2, NOW() + INTERVAL '30 days'),
(3, NOW() + INTERVAL '1 day')
ON CONFLICT (user_id) DO NOTHING;

-- =========================
-- PAYMENTS
-- =========================
INSERT INTO payments (user_id, plan_id, code, is_used, created_at, used_at) VALUES
(1, 2, 'SGPAY_TEST_001', TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(2, 3, 'SGPAY_TEST_002', TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(3, 1, 'SGPAY_TEST_003', FALSE, NOW(), NULL)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- QR LOGS
-- =========================
INSERT INTO qr_logs (user_id, code, scanned_at) VALUES
(1, 'SGPAY_TEST_001', NOW() - INTERVAL '1 day'),
(2, 'SGPAY_TEST_002', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- =========================
-- SYNC COUNTS FROM LOG TABLES
-- =========================
UPDATE users u
SET favorite_count = sub.cnt
FROM (
  SELECT user_id, COUNT(*) AS cnt
  FROM favorites
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

UPDATE users
SET favorite_count = 0
WHERE id NOT IN (SELECT DISTINCT user_id FROM favorites);

UPDATE users u
SET listened_poi_count = sub.cnt
FROM (
  SELECT user_id, COUNT(*) AS cnt
  FROM listen_logs
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

UPDATE users
SET listened_poi_count = 0
WHERE id NOT IN (SELECT DISTINCT user_id FROM listen_logs);

UPDATE pois p
SET listened_count = sub.cnt
FROM (
  SELECT poi_id, COUNT(*) AS cnt
  FROM listen_logs
  GROUP BY poi_id
) sub
WHERE p.id = sub.poi_id;

UPDATE pois
SET listened_count = 0
WHERE id NOT IN (SELECT DISTINCT poi_id FROM listen_logs);

-- =========================
-- FIX USER SEQUENCE
-- =========================
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

COMMIT;