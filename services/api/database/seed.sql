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
),
(
  '3',
  'Chợ Bến Thành',
  'Văn hóa',
  '["Chợ","Mua sắm","Ẩm thực","Văn hóa"]'::jsonb,
  'Khu chợ nổi tiếng Sài Gòn',
  'Chợ Bến Thành là biểu tượng lâu đời của TP.HCM.',
  'Quận 1, TP.HCM',
  '06:00',
  '18:00',
  'Miễn phí',
  10.772107,
  106.698278
),

-- 🏠 NHÀ BẠN
(
  '4',
  'Nhà tôi',
  'Cá nhân',
  '["Nhà","Cá nhân"]'::jsonb,
  'Nhà riêng',
  'Địa điểm test tracking gần thực tế.',
  '196 Phan Đăng Lưu, Phường Đức Nhuận, TP.HCM',
  '00:00',
  '23:59',
  'Miễn phí',
  10.801500,
  106.687800
),

-- 🏠 HÀNG XÓM
(
  '5',
  'Nhà hàng xóm',
  'Cá nhân',
  '["Nhà","Cá nhân"]'::jsonb,
  'Nhà kế bên',
  'Dùng để test khoảng cách rất gần.',
  '206 Phan Đăng Lưu, Phường Đức Nhuận, TP.HCM',
  '00:00',
  '23:59',
  'Miễn phí',
  10.800419842651404,
  106.68120426805898
);

INSERT INTO poi_images (poi_id, image_url, sort_order) VALUES
('1', '/images/pois/poi-1-1.jpg', 1),
('1', '/images/pois/poi-1-2.jpg', 2),

('2', '/images/pois/poi-2-1.jpg', 1),
('2', '/images/pois/poi-2-2.jpg', 2),

('3', '/images/pois/poi-3-1.jpg', 1),
('3', '/images/pois/poi-3-2.jpg', 2),

('4', '/images/pois/poi-4-1.jpg', 1),
('5', '/images/pois/poi-5-1.jpg', 1);

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
),
(
  'a3',
  '3',
  'vi',
  'Tiếng Việt',
  'Hoàng Minh',
  'Chợ Bến Thành là khu chợ nổi tiếng.'
),
(
  'a4',
  '4',
  'vi',
  'Tiếng Việt',
  'System',
  'Bạn đã đến nhà của mình.'
),
(
  'a5',
  '5',
  'vi',
  'Tiếng Việt',
  'System',
  'Bạn đã đến nhà hàng xóm.'
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