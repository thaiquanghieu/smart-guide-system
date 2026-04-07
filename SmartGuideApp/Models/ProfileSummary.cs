namespace SmartGuideApp.Models;

public class ProfileSummary
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public int FavoriteCount { get; set; }
    public int ListenedPoiCount { get; set; }
}