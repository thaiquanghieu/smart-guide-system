BEGIN;

-- =========================
-- POIS
-- =========================
INSERT INTO pois (
  id, name, category, categories, short_description, description, address,
  open_time, close_time, price_text, listened_count, rating_avg, rating_count, latitude, longitude
) VALUES
('1','Nhà thờ Đức Bà','Di tích lịch sử','["Di tích","Lịch sử","Nhà thờ","Kiến trúc"]','Biểu tượng kiến trúc nổi bật','Nhà thờ Đức Bà Sài Gòn là công trình tiêu biểu tại TP.HCM.','Quận 1, TP.HCM','08:00','17:00','Miễn phí',120,4.8,25,10.779783,106.699018),

('2','Thảo Cầm Viên','Thiên nhiên','["Thiên nhiên","Sở thú"]','Không gian xanh lâu đời','Công viên lâu đời tại TP.HCM','Quận 1','07:00','18:30','60.000đ',80,4.3,10,10.787088,106.705856),

('3','Chợ Bến Thành','Văn hóa','["Chợ","Mua sắm","Ẩm thực","Văn hóa"]','Khu chợ nổi tiếng Sài Gòn','Chợ Bến Thành là biểu tượng lâu đời của TP.HCM.','Quận 1, TP.HCM','06:00','18:00','Miễn phí',200,4.1,40,10.772107,106.698278),

('4','Nhà tôi','Cá nhân','["Nhà","Cá nhân"]','Nhà riêng','Địa điểm test tracking gần thực tế.','196 Phan Đăng Lưu','00:00','23:59','Miễn phí',5,3.5,2,10.801500,106.687800),

('5','Nhà hàng xóm','Cá nhân','["Nhà","Cá nhân"]','Nhà kế bên','Dùng để test khoảng cách rất gần.','206 Phan Đăng Lưu','00:00','23:59','Miễn phí',2,0,0,10.800419842651404,106.68120426805898);

-- =========================
-- IMAGES
-- =========================
INSERT INTO poi_images (poi_id, image_url, sort_order) VALUES
('1','/images/pois/poi-1-1.jpg',1),
('1','/images/pois/poi-1-2.jpg',2),
('2','/images/pois/poi-2-1.jpg',1),
('2','/images/pois/poi-2-2.jpg',2),
('3','/images/pois/poi-3-1.jpg',1),
('3','/images/pois/poi-3-2.jpg',2),
('4','/images/pois/poi-4-1.jpg',1),
('5','/images/pois/poi-5-1.jpg',1);

-- =========================
-- AUDIO (FULL 5 LANG)
-- =========================
INSERT INTO audio_guides (
  id, poi_id, language_code, language_name, voice_name, script_text
) VALUES

-- ===== POI 1: NOTRE DAME =====
('1_vi','1','vi','Tiếng Việt','System','Nhà thờ Đức Bà Sài Gòn là công trình kiến trúc tiêu biểu của thành phố.'),
('1_en','1','en','English','System','Notre Dame Cathedral of Saigon is a famous architectural landmark in Ho Chi Minh City.'),
('1_ja','1','ja','日本語','System','サイゴンのノートルダム大聖堂は、ホーチミン市の有名な建築物です。'),
('1_ko','1','ko','한국어','System','사이공 노트르담 대성당은 호치민시의 대표적인 건축물입니다.'),
('1_zh','1','zh','中文','System','西贡圣母大教堂是胡志明市著名的建筑地标。'),

-- ===== POI 2: ZOO =====
('2_vi','2','vi','Tiếng Việt','System','Thảo Cầm Viên Sài Gòn là một trong những sở thú lâu đời nhất Việt Nam.'),
('2_en','2','en','English','System','Saigon Zoo and Botanical Gardens is one of the oldest zoos in Vietnam.'),
('2_ja','2','ja','日本語','System','サイゴン動植物園はベトナムで最も古い動物園の一つです。'),
('2_ko','2','ko','한국어','System','사이공 동물원은 베트남에서 가장 오래된 동물원 중 하나입니다.'),
('2_zh','2','zh','中文','System','西贡动植物园是越南最古老的动物园之一。'),

-- ===== POI 3: BEN THANH =====
('3_vi','3','vi','Tiếng Việt','System','Chợ Bến Thành là biểu tượng văn hóa lâu đời của Sài Gòn.'),
('3_en','3','en','English','System','Ben Thanh Market is a long-standing cultural symbol of Saigon.'),
('3_ja','3','ja','日本語','System','ベンタイン市場はサイゴンの歴史ある文化的象徴です。'),
('3_ko','3','ko','한국어','System','벤탄 시장은 사이공의 대표적인 문화 상징입니다.'),
('3_zh','3','zh','中文','System','滨城市场是西贡著名的文化象征。'),

-- ===== POI 4: HOME =====
('4_vi','4','vi','Tiếng Việt','System','Bạn đã đến nhà của mình.'),
('4_en','4','en','English','System','You have arrived at your home.'),
('4_ja','4','ja','日本語','System','あなたの家に到着しました。'),
('4_ko','4','ko','한국어','System','당신의 집에 도착했습니다.'),
('4_zh','4','zh','中文','System','你已到达你的家。'),

-- ===== POI 5: NEIGHBOR =====
('5_vi','5','vi','Tiếng Việt','System','Bạn đã đến nhà hàng xóm.'),
('5_en','5','en','English','System','You have arrived at your neighbor’s house.'),
('5_ja','5','ja','日本語','System','隣の家に到着しました。'),
('5_ko','5','ko','한국어','System','이웃집에 도착했습니다.'),
('5_zh','5','zh','中文','System','你已到达邻居的家。');

-- =========================
-- USER
-- =========================
INSERT INTO users (
  user_name, email, avatar_url, favorite_count, listened_poi_count
) VALUES (
  'User Demo',
  'demo@email.com',
  '/images/avatar.png',
  5,
  10
);

COMMIT;