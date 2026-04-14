BEGIN;

INSERT INTO pois (
  id, name, category, categories, short_description, description, address,
  open_time, close_time, price_text, latitude, longitude
) VALUES
(
  '1',
  'Nhà thờ Đức Bà',
  'Di tích lịch sử',
  '["Di tích","Lịch sử","Nhà thờ","Kiến trúc"]'::jsonb,
  'Biểu tượng kiến trúc nổi bật',
  'Nhà thờ Đức Bà Sài Gòn là công trình tiêu biểu tại TP.HCM.',
  'Quận 1, TP.HCM',
  '08:00',
  '17:00',
  'Miễn phí',
  10.779783,
  106.699018
),
(
  '2',
  'Thảo Cầm Viên',
  'Thiên nhiên',
  '["Thiên nhiên","Sở thú"]'::jsonb,
  'Không gian xanh lâu đời',
  'Công viên lâu đời tại TP.HCM',
  'Quận 1',
  '07:00',
  '18:30',
  '60.000đ',
  10.787088,
  106.705856
);

INSERT INTO poi_images (poi_id, image_url, sort_order) VALUES
('1', '/images/pois/poi-1-1.jpg', 1),
('1', '/images/pois/poi-1-2.jpg', 2),
('2', '/images/pois/poi-2-1.jpg', 1),
('2', '/images/pois/poi-2-2.jpg', 2);

INSERT INTO audio_guides (
  id, poi_id, language_code, language_name, voice_name, script_text
) VALUES
(
  'a1',
  '1',
  'vi',
  'Tiếng Việt',
  'Minh Anh',
  'Nhà thờ Đức Bà là công trình nổi bật.'
),
(
  'a2',
  '2',
  'vi',
  'Tiếng Việt',
  'Lan Chi',
  'Thảo Cầm Viên là không gian sinh thái.'
);

INSERT INTO profiles (
  user_name, email, avatar_url, favorite_count, listened_poi_count
) VALUES (
  'User Demo',
  'demo@email.com',
  '/images/avatar.png',
  5,
  10
);

COMMIT;