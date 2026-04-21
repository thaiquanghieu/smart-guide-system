BEGIN;

-- =========================
-- USERS
-- =========================
INSERT INTO users (user_name, email, password_hash, avatar_url, role, is_active) 
VALUES
('owner_1', 'owner1@example.com', 'owner123', '/images/owner-1.png', 'owner', true),
('owner_2', 'owner2@example.com', 'owner123', '/images/owner-2.png', 'owner', true),
('admin', 'admin@smartguide.com', 'admin123', '/images/admin.png', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- =========================
-- POIS (5 POI ĐÚNG YÊU CẦU)
-- =========================
INSERT INTO pois (
  id, owner_id, name, category, categories, short_description, description,
  address, open_time, close_time, price_text, radius, priority, status,
  latitude, longitude, listened_count, rating_avg, rating_count
) VALUES
(
  '1',1,
  'Nhà thờ Đức Bà Sài Gòn',
  'Kiến trúc',
  '["Kiến trúc","Tôn giáo","Lịch sử"]'::jsonb,
  'Biểu tượng kiến trúc Sài Gòn.',
  'Nhà thờ Đức Bà là công trình nổi bật mang phong cách châu Âu giữa trung tâm thành phố.',
  '01 Công xã Paris, Quận 1, TP.HCM',
  '08:00','17:00','Miễn phí',
  100,10,'approved',
  10.779783,106.699018,15,4.8,125
),
(
  '2',1,
  'Thảo Cầm Viên Sài Gòn',
  'Thiên nhiên',
  '["Thiên nhiên","Sở thú"]'::jsonb,
  'Sở thú lâu đời.',
  'Thảo Cầm Viên là không gian xanh kết hợp vườn thú nổi tiếng tại TP.HCM.',
  '02 Nguyễn Bỉnh Khiêm, Quận 1',
  '07:00','17:30','60.000đ',
  150,5,'approved',
  10.787071,106.705002,22,4.6,210
),
(
  '3',2,
  'Chợ Bến Thành',
  'Văn hóa',
  '["Văn hóa","Ẩm thực"]'::jsonb,
  'Chợ nổi tiếng.',
  'Chợ Bến Thành là điểm đến mua sắm và trải nghiệm văn hóa đặc trưng của Sài Gòn.',
  'Lê Lợi, Quận 1',
  '06:00','18:00','Miễn phí',
  120,8,'approved',
  10.772518,106.698032,18,4.5,185
),
(
  '4',1,
  'Trường Đại học Sài Gòn - Cơ sở 1',
  'Giáo dục',
  '["Giáo dục","Đại học"]'::jsonb,
  'Cơ sở chính SGU.',
  'Nơi đào tạo sinh viên với môi trường học tập năng động và hiện đại.',
  '105 Bà Huyện Thanh Quan, Phường Xuân Hòa, TP.HCM',
  '07:00','18:00','Miễn phí',
  120,6,'approved',
  10.779408068913465,106.68448477006496,0,5,1
),
(
  '5',2,
  'Bệnh viện Mắt TP.HCM',
  'Y tế',
  '["Y tế","Bệnh viện"]'::jsonb,
  'Bệnh viện chuyên khoa mắt.',
  'Nơi khám và điều trị các bệnh về mắt với đội ngũ bác sĩ chuyên môn cao.',
  '280 Điện Biên Phủ, Phường Xuân Hòa, TP.HCM',
  '07:00','16:30','Theo dịch vụ',
  120,7,'approved',
  10.778903838810287,106.68495472988727,0,4.8,1
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

('4', 'https://commons.wikimedia.org/wiki/Special:FilePath/Saigon_University_campus_2_%2820230705_1527%29.jpg', 1),
('4', 'https://commons.wikimedia.org/wiki/Special:FilePath/Saigon_University.JPG', 2),

('5', 'https://commons.wikimedia.org/wiki/Special:FilePath/Benh_vien_Mat_saigon_-_panoramio.jpg', 1),
('5', 'https://commons.wikimedia.org/wiki/Special:FilePath/Clinique_Saint-Paul_%C3%A0_Sa%C3%AFgon.jpg', 2);

-- =========================
-- AUDIO (THÊM zh + 2-3 câu)
-- =========================
INSERT INTO audio_guides (
  id, poi_id, language_code, language_name, voice_name, script_text
) VALUES

-- POI 1
('1_vi','1','vi','Tiếng Việt','System','Nhà thờ Đức Bà là biểu tượng kiến trúc của Sài Gòn. Công trình mang phong cách châu Âu cổ kính. Đây là điểm check-in nổi tiếng của du khách.'),
('1_en','1','en','English','System','Notre Dame Cathedral is an iconic landmark of Saigon. It features European architecture. It is a popular tourist attraction.'),
('1_ja','1','ja','日本語','System','ノートルダム大聖堂はサイゴンの象徴です。ヨーロッパ風の建築です。観光客に人気があります。'),
('1_ko','1','ko','한국어','System','노트르담 성당은 사이공의 상징입니다. 유럽식 건축입니다. 관광 명소입니다.'),
('1_zh','1','zh','中文','System','圣母大教堂是西贡的标志性建筑。具有欧洲风格。是著名旅游景点。'),

-- POI 2
('2_vi','2','vi','Tiếng Việt','System','Thảo Cầm Viên là sở thú lâu đời tại Việt Nam. Đây là nơi thư giãn xanh giữa thành phố. Phù hợp cho gia đình và trẻ em.'),
('2_en','2','en','English','System','Saigon Zoo is one of the oldest in Vietnam. It offers a green space in the city. Suitable for families.'),
('2_ja','2','ja','日本語','System','サイゴン動物園はベトナムで最も古いです。緑豊かな空間です。家族向けです。'),
('2_ko','2','ko','한국어','System','사이공 동물원은 오래된 동물원입니다. 도심 속 녹지입니다. 가족에게 좋습니다.'),
('2_zh','2','zh','中文','System','西贡动物园是越南最古老的动物园之一。这里是城市中的绿色空间。适合家庭游玩。'),

-- POI 3
('3_vi','3','vi','Tiếng Việt','System','Chợ Bến Thành là biểu tượng văn hóa của Sài Gòn. Nơi đây có nhiều món ăn và hàng hóa. Rất đông du khách ghé thăm mỗi ngày.'),
('3_en','3','en','English','System','Ben Thanh Market is a cultural symbol. It offers food and shopping. It is crowded with tourists.'),
('3_ja','3','ja','日本語','System','ベンタイン市場は文化的象徴です。食べ物と買い物が楽しめます。観光客で賑わいます。'),
('3_ko','3','ko','한국어','System','벤탄 시장은 문화 상징입니다. 음식과 쇼핑이 가능합니다. 관광객이 많습니다.'),
('3_zh','3','zh','中文','System','滨城市场是文化象征。这里有美食和购物。每天都有很多游客。'),

-- POI 4
('4_vi','4','vi','Tiếng Việt','System','Đây là Trường Đại học Sài Gòn cơ sở 1. Nơi học tập của nhiều sinh viên. Môi trường năng động và hiện đại.'),
('4_en','4','en','English','System','This is Saigon University campus 1. It is a place for students. It has a dynamic environment.'),
('4_ja','4','ja','日本語','System','サイゴン大学第1キャンパスです。学生が学ぶ場所です。活気ある環境です。'),
('4_ko','4','ko','한국어','System','사이공 대학교 1캠퍼스입니다. 학생들의 공간입니다. 활기찬 환경입니다.'),
('4_zh','4','zh','中文','System','这是西贡大学第一校区。是学生学习的地方。环境充满活力。'),

-- POI 5
('5_vi','5','vi','Tiếng Việt','System','Đây là Bệnh viện Mắt TP.HCM. Chuyên điều trị các bệnh về mắt. Có đội ngũ bác sĩ giỏi.'),
('5_en','5','en','English','System','This is the Eye Hospital. It specializes in eye care. Doctors are experienced.'),
('5_ja','5','ja','日本語','System','眼科病院です。目の治療を専門としています。医師は経験豊富です。'),
('5_ko','5','ko','한국어','System','안과 병원입니다. 눈 치료 전문입니다. 의사가 숙련되어 있습니다.'),
('5_zh','5','zh','中文','System','这是眼科医院。专门治疗眼科疾病。医生经验丰富。')

ON CONFLICT (id) DO NOTHING;

COMMIT;
