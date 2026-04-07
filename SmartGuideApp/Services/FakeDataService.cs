using SmartGuideApp.Models;

namespace SmartGuideApp.Services;

public class FakeDataService
{
    public List<POI> GetPOIs()
    {
        return new List<POI>
        {
            new POI
            {
                Id = "1",
                Name = "Nhà thờ Đức Bà",
                Description = "Địa điểm nổi tiếng tại TP.HCM",
                Address = "Quận 1, TP.HCM",
                DistanceKm = 1.2,
                ImageUrl = "https://picsum.photos/400/300",
                Audios = new List<AudioGuide>
                {
                    new AudioGuide
                    {
                        Id = "1",
                        LanguageCode = "vi",
                        LanguageName = "Tiếng Việt",
                        VoiceName = "Giọng nữ",
                        DurationText = "03:20",
                        ScriptText = "Nhà thờ Đức Bà là một trong những công trình kiến trúc nổi tiếng nhất tại TP.HCM."
                    },
                    new AudioGuide
                    {
                        Id = "2",
                        LanguageCode = "en",
                        LanguageName = "English",
                        VoiceName = "Female Voice",
                        DurationText = "03:10",
                        ScriptText = "Notre-Dame Cathedral is one of the most famous architectural landmarks in Ho Chi Minh City."
                    }
                }
            },
            new POI
            {
                Id = "2",
                Name = "Bưu điện Thành phố",
                Description = "Kiến trúc cổ kính giữa trung tâm",
                Address = "Quận 1, TP.HCM",
                DistanceKm = 1.5,
                ImageUrl = "https://picsum.photos/401/300",
                Audios = new List<AudioGuide>
                {
                    new AudioGuide
                    {
                        Id = "3",
                        LanguageCode = "vi",
                        LanguageName = "Tiếng Việt",
                        VoiceName = "Giọng nam",
                        DurationText = "02:45",
                        ScriptText = "Bưu điện Thành phố là công trình kiến trúc cổ mang đậm dấu ấn Pháp."
                    }
                }
            },
            new POI
            {
                Id = "3",
                Name = "Highlands Coffee",
                Description = "Quán cà phê quen thuộc, dễ ghé thăm",
                Address = "Quận 1, TP.HCM",
                DistanceKm = 0.5,
                ImageUrl = "https://picsum.photos/402/300",
                Audios = new List<AudioGuide>
                {
                    new AudioGuide
                    {
                        Id = "4",
                        LanguageCode = "vi",
                        LanguageName = "Tiếng Việt",
                        VoiceName = "Giọng nữ",
                        DurationText = "01:50",
                        ScriptText = "Đây là một quán cà phê nổi bật, phù hợp để nghỉ chân và trải nghiệm không gian đô thị."
                    }
                }
            }
        };
    }

    public ProfileSummary GetProfileSummary()
    {
        return new ProfileSummary
        {
            UserName = "Nguyễn Minh Tú",
            Email = "minhtu.traveler@email.com",
            AvatarUrl = "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
            FavoriteCount = 12,
            ListenedPoiCount = 24
        };
    }
}