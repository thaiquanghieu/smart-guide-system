using SmartGuideApp.Models;

namespace SmartGuideApp.Services;

public class MockDataService
{
    public List<POI> GetPois()
    {
        return new List<POI>
        {
            new POI
            {
                Id = "1",
                Name = "Nhà thờ Đức Bà",
                Category = "Di tích lịch sử",
                Categories = new List<string> { "Di tích", "Lịch sử", "Nhà thờ", "Kiến trúc" },
                ShortDescription = "Biểu tượng kiến trúc nổi bật giữa trung tâm Sài Gòn.",
                Description = "Nhà thờ Đức Bà Sài Gòn là một trong những công trình kiến trúc tiêu biểu nhất tại trung tâm TP.HCM. Công trình mang phong cách Romanesque kết hợp Gothic, nổi bật với mặt tiền gạch đỏ và hai tháp chuông cao. Đây là điểm tham quan quen thuộc của du khách trong và ngoài nước.",
                Address = "01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM",
                DistanceKm = 1.5,
                ImageUrl = "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80",
                ImageUrls = new List<string>
                {
                    "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
                },
                OpenHours = "08:00 - 17:00",
                PriceText = "Miễn phí",
                IsFavorite = false,
                ListenedCount = 5,
                Latitude = 10.779783,
                Longitude = 106.699018,
                Audios = new List<AudioGuide>
                {
                    new AudioGuide
                    {
                        Id = "a1",
                        LanguageCode = "vi",
                        LanguageName = "Tiếng Việt",
                        VoiceName = "Minh Anh",
                        DurationText = "05:24",
                        ScriptText = "Nhà thờ Đức Bà Sài Gòn là công trình kiến trúc nổi bật giữa trung tâm Thành phố Hồ Chí Minh. Được xây dựng vào cuối thế kỷ 19, nơi đây mang dấu ấn phong cách Romanesque và Gothic của Pháp."
                    }
                }
            },
            new POI
            {
                Id = "2",
                Name = "Thảo Cầm Viên",
                Category = "Thiên nhiên",
                Categories = new List<string> { "Thiên nhiên", "Sở thú", "Công viên", "Gia đình" },
                ShortDescription = "Không gian xanh lâu đời, phù hợp tham quan và thư giãn.",
                Description = "Thảo Cầm Viên là một trong những công viên lâu đời nhất Việt Nam, kết hợp giữa vườn thú, không gian sinh thái và khu tham quan xanh giữa lòng thành phố. Đây là địa điểm phù hợp cho gia đình, du khách và học sinh.",
                Address = "02 Nguyễn Bỉnh Khiêm, Bến Nghé, Quận 1, TP.HCM",
                DistanceKm = 2.8,
                ImageUrl = "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
                ImageUrls = new List<string>
                {
                    "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80"
                },
                OpenHours = "07:00 - 18:30",
                PriceText = "60.000đ",
                IsFavorite = false,
                ListenedCount = 2,
                Latitude = 10.787088,
                Longitude = 106.705856,
                Audios = new List<AudioGuide>
                {
                    new AudioGuide
                    {
                        Id = "a2",
                        LanguageCode = "vi",
                        LanguageName = "Tiếng Việt",
                        VoiceName = "Lan Chi",
                        DurationText = "04:10",
                        ScriptText = "Thảo Cầm Viên là không gian sinh thái lâu đời, nơi lưu giữ hàng trăm loài thực vật và động vật. Đây là điểm đến quen thuộc của nhiều gia đình và du khách khi ghé thăm Sài Gòn."
                    }
                }
            },
            new POI
            {
                Id = "3",
                Name = "Bưu điện Thành phố",
                Category = "Kiến trúc",
                Categories = new List<string> { "Kiến trúc", "Lịch sử", "Bưu điện", "Check-in" },
                ShortDescription = "Công trình cổ điển nổi bật ngay cạnh Nhà thờ Đức Bà.",
                Description = "Bưu điện Thành phố là công trình kiến trúc có giá trị lịch sử và thẩm mỹ cao. Không chỉ là nơi phục vụ bưu chính, nơi đây còn là điểm check-in nổi tiếng với không gian cổ kính và độc đáo.",
                Address = "02 Công xã Paris, Bến Nghé, Quận 1, TP.HCM",
                DistanceKm = 1.7,
                ImageUrl = "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
                ImageUrls = new List<string>
                {
                    "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80"
                },
                OpenHours = "07:00 - 19:00",
                PriceText = "Miễn phí",
                IsFavorite = false,
                ListenedCount = 3,
                Latitude = 10.780509,
                Longitude = 106.699264,
                Audios = new List<AudioGuide>
                {
                    new AudioGuide
                    {
                        Id = "a3",
                        LanguageCode = "vi",
                        LanguageName = "Tiếng Việt",
                        VoiceName = "Quang Huy",
                        DurationText = "03:45",
                        ScriptText = "Bưu điện Thành phố là một trong những biểu tượng kiến trúc đặc sắc của khu trung tâm Sài Gòn. Không gian bên trong mang vẻ đẹp cổ điển với mái vòm cao và sàn gạch họa tiết."
                    }
                }
            }
        };
    }

    public ProfileSummary GetProfileSummary()
    {
        return new ProfileSummary
        {
            UserName = "Thái Quang Hiểu",
            Email = "thaiquanghieu@email.com",
            AvatarUrl = "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
            FavoriteCount = 12,
            ListenedPoiCount = 24
        };
    }
}