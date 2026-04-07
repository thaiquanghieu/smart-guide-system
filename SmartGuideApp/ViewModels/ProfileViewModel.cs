using SmartGuideApp.Services;

namespace SmartGuideApp.ViewModels;

public class ProfileViewModel : BaseViewModel
{
    public string UserName { get; }
    public string Email { get; }
    public string AvatarUrl { get; }
    public int FavoriteCount { get; }
    public int ListenedPoiCount { get; }

    public ProfileViewModel()
    {
        var profile = new MockDataService().GetProfileSummary();
        UserName = profile.UserName;
        Email = profile.Email;
        AvatarUrl = profile.AvatarUrl;
        FavoriteCount = profile.FavoriteCount;
        ListenedPoiCount = profile.ListenedPoiCount;
    }
}