using SmartGuideApp.Services;

namespace SmartGuideApp.ViewModels;

public class ProfileViewModel : BaseViewModel
{
    public string UserName { get; set; } = "";
    public string Email { get; set; } = "";
    public string AvatarUrl { get; set; } = "";
    public int FavoriteCount { get; set; }
    public int ListenedPoiCount { get; set; }

    public ProfileViewModel()
    {
        InitTrackingConfig();
        _ = LoadProfile();
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
            AvatarUrl = $"http://192.168.22.4:5022{profile.AvatarUrl}";
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
    }
}