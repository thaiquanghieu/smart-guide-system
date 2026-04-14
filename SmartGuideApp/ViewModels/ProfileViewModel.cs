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
        _ = LoadProfile();
    }

    private async Task LoadProfile()
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
}