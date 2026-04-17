using System.Collections.ObjectModel;
using System.Linq;
using SmartGuideApp.Services;
using Microsoft.Maui.Storage;

namespace SmartGuideApp.ViewModels;

public class ProfileViewModel : BaseViewModel
{
    public string DaysLeftText { get; set; } = "Đang kiểm tra...";
    public string UserName { get; set; } = "";
    public string Email { get; set; } = "";
    public string AvatarUrl { get; set; } = "";
    public int FavoriteCount { get; set; }
    public int ListenedPoiCount { get; set; }

    public ProfileViewModel()
    {
        InitTrackingConfig();
        _ = LoadProfile();
        _ = LoadAvailableLanguagesAsync();

        _ = LoadSubscription();
    }

    // language options (code + human-friendly name)
    public ObservableCollection<LanguageItem> LanguageOptions { get; } = new();

    // Selected item for App language picker
    public LanguageItem? SelectedAppLanguageItem
    {
        get => LanguageOptions.FirstOrDefault(l => l.Code == AppLanguage) ?? LanguageOptions.FirstOrDefault();
        set
        {
            if (value == null) return;
            // update preference (this also triggers other bindings via AppLanguage setter)
            AppLanguage = value.Code;
            // ensure UI pickers update
            OnPropertyChanged(nameof(SelectedAppLanguageItem));
            OnPropertyChanged(nameof(SelectedAudioLanguageItem));
        }
    }

    // Selected item for Audio language picker
    public LanguageItem? SelectedAudioLanguageItem
    {
        get => LanguageOptions.FirstOrDefault(l => l.Code == AudioLanguage) ?? LanguageOptions.FirstOrDefault();
        set
        {
            if (value == null) return;
            AudioLanguage = value.Code;
            OnPropertyChanged(nameof(SelectedAudioLanguageItem));
        }
    }

    private async Task LoadAvailableLanguagesAsync()
    {
        try
        {
            var api = new ApiService();
            var pois = await api.GetPoisAsync();

            var langs = pois
                .Where(p => p.Audios != null)
                .SelectMany(p => p.Audios)
                .Where(a => !string.IsNullOrWhiteSpace(a.LanguageCode))
                .GroupBy(a => a.LanguageCode)
                .Select(g => new LanguageItem { Code = g.Key, Name = g.First().LanguageName ?? g.Key })
                .OrderBy(l => l.Name)
                .ToList();

            // fallback defaults if API returned nothing
            if (langs.Count == 0)
            {
                langs = new List<LanguageItem>
                {
                    new LanguageItem{ Code = "vi", Name = "Tiếng Việt" },
                    new LanguageItem{ Code = "en", Name = "English" },
                    new LanguageItem{ Code = "ja", Name = "日本語" },
                    new LanguageItem{ Code = "ko", Name = "한국어" },
                    new LanguageItem{ Code = "zh", Name = "中文" }
                };
            }

            // populate collection on UI thread
            LanguageOptions.Clear();
            foreach (var l in langs)
                LanguageOptions.Add(l);

            // ensure selected items reflect current preferences
            OnPropertyChanged(nameof(SelectedAppLanguageItem));
            OnPropertyChanged(nameof(SelectedAudioLanguageItem));
        }
        catch
        {
            // ignore and leave defaults
        }
    }

    public async Task LoadProfile()
    {
        try
        {
            var api = new ApiService();
            var profile = await api.GetProfileAsync();

            if (profile == null) return;

            UserName = profile.UserName;
            Email = profile.Email;
            AvatarUrl = string.IsNullOrWhiteSpace(profile.AvatarUrl) ? "user.png" : $"http://172.20.10.3:5022{profile.AvatarUrl}";
            FavoriteCount = profile.FavoriteCount;
            ListenedPoiCount = profile.ListenedPoiCount;

            OnPropertyChanged(nameof(UserName));
            OnPropertyChanged(nameof(Email));
            OnPropertyChanged(nameof(AvatarUrl));
            OnPropertyChanged(nameof(FavoriteCount));
            OnPropertyChanged(nameof(ListenedPoiCount));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ PROFILE ERROR: {ex.Message}");
        }
    }

    public bool IsBatterySaver
    {
        get => Preferences.Get("battery_saver", false);
        set
        {
            Preferences.Set("battery_saver", value);
            OnPropertyChanged();
        }
    }

    public double TrackingRadiusKm
    {
        get => Preferences.Get("tracking_radius", 0.2);
        set
        {
            Preferences.Set("tracking_radius", value);
            OnPropertyChanged();
        }
    }

    public int TrackingIntervalMs
    {
        get => Preferences.Get("tracking_interval", 5000);
        set
        {
            Preferences.Set("tracking_interval", value);
            OnPropertyChanged();
        }
    }

    public void ApplyBatterySaver()
    {
        TrackingRadiusKm = 0.3;   // 300m
        TrackingIntervalMs = 10000; // 10s
    }

    public void DisableBatterySaver()
    {
        TrackingRadiusKm = 0.2;
        TrackingIntervalMs = 5000;
    }

    private void InitTrackingConfig()
    {
        // nếu chưa có data → set default
        if (!Preferences.ContainsKey("tracking_radius"))
            TrackingRadiusKm = 0.2;

        if (!Preferences.ContainsKey("tracking_interval"))
            TrackingIntervalMs = 5000;
    }

    public async Task RefreshAsync()
    {
        await LoadProfile();
        await LoadSubscription();
    }

    // ===== LANGUAGE SETTINGS =====

    // App language
    public string AppLanguage
    {
        get => Preferences.Get("app_lang", "vi");
        set
        {
            Preferences.Set("app_lang", value);

            // nếu chưa custom audio → sync theo app
            if (!IsAudioCustom)
            {
                Preferences.Set("audio_lang", value);
                OnPropertyChanged(nameof(AudioLanguage));
                // also update picker SelectedItem bindings
                OnPropertyChanged(nameof(SelectedAudioLanguageItem));
                OnPropertyChanged(nameof(SelectedAppLanguageItem));
            }

            OnPropertyChanged();
            // ensure App picker reflects change
            OnPropertyChanged(nameof(SelectedAppLanguageItem));
        }
    }

    // Audio language
    public string AudioLanguage
    {
        get => Preferences.Get("audio_lang", "vi");
        set
        {
            Preferences.Set("audio_lang", value);
            OnPropertyChanged();
        }
    }

    // bật/tắt custom audio
    public bool IsAudioCustom
    {
        get => Preferences.Get("audio_custom", false);
        set
        {
            Preferences.Set("audio_custom", value);

            if (!value)
            {
                // nếu tắt → sync lại theo app
                AudioLanguage = AppLanguage;
                // update picker selection to reflect new audio language
                OnPropertyChanged(nameof(SelectedAudioLanguageItem));
            }

            OnPropertyChanged();
            OnPropertyChanged(nameof(IsAudioLocked));
        }
    }

    // để disable UI
    public bool IsAudioLocked => !IsAudioCustom;

    private async Task LoadSubscription()
    {
        try
        {
            var client = new HttpClient();

            var userId = Preferences.Get("user_id", 0);

            if (userId == 0)
            {
                DaysLeftText = "Chưa đăng nhập";
                OnPropertyChanged(nameof(DaysLeftText));
                return;
            }

            var json = await client.GetStringAsync(
                $"http://172.20.10.3:5022/api/payments/check?userId={userId}");

            var result = System.Text.Json.JsonSerializer.Deserialize<CheckResponse>(json);

            if (result != null && result.isActive && result.expire != null)
            {
                var remaining = result.expire.Value - DateTime.UtcNow;

                if (remaining.TotalSeconds <= 0)
                {
                    DaysLeftText = "Hết hạn";
                }
                else
                {
                    var daysLeft = (int)Math.Floor(remaining.TotalDays);
                    if (daysLeft <= 0)
                        daysLeft = 1;

                    DaysLeftText = $"Còn {daysLeft} ngày sử dụng";
                }
            }
            else
            {
                DaysLeftText = "Hết hạn";
            }

            OnPropertyChanged(nameof(DaysLeftText));
        }
        catch
        {
            DaysLeftText = "Không tải được";
            OnPropertyChanged(nameof(DaysLeftText));
        }
    }

    class CheckResponse
    {
        public bool isActive { get; set; }
        public DateTime? expire { get; set; }
    }
}