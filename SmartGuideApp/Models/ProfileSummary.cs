namespace SmartGuideApp.Models;

public class ProfileSummary
{
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceUuid { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string AppVersion { get; set; } = string.Empty;
    public int FavoriteCount { get; set; }
    public int ListenedPoiCount { get; set; }
}
