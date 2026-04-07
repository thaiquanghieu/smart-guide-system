using SmartGuideApp.Models;

namespace SmartGuideApp.ViewModels;

public class DetailViewModel : BaseViewModel
{
    private POI? _poi;

    public POI? Poi
    {
        get => _poi;
        set
        {
            if (SetProperty(ref _poi, value))
            {
                OnPropertyChanged(nameof(Title));
                OnPropertyChanged(nameof(Category));
                OnPropertyChanged(nameof(Address));
                OnPropertyChanged(nameof(ImageUrl));
                OnPropertyChanged(nameof(Description));
                OnPropertyChanged(nameof(OpenHours));
                OnPropertyChanged(nameof(PriceText));
                OnPropertyChanged(nameof(AudioVoice));
                OnPropertyChanged(nameof(AudioDuration));
                OnPropertyChanged(nameof(ScriptText));
            }
        }
    }

    public string Title => Poi?.Name ?? string.Empty;
    public string Category => Poi?.Category ?? string.Empty;
    public string Address => Poi?.Address ?? string.Empty;
    public string ImageUrl => Poi?.ImageUrl ?? string.Empty;
    public string Description => Poi?.Description ?? string.Empty;
    public string OpenHours => Poi?.OpenHours ?? string.Empty;
    public string PriceText => Poi?.PriceText ?? string.Empty;
    public string AudioVoice => Poi?.Audios.FirstOrDefault()?.VoiceName ?? "Đang cập nhật";
    public string AudioDuration => Poi?.Audios.FirstOrDefault()?.DurationText ?? "--:--";
    public string ScriptText => Poi?.Audios.FirstOrDefault()?.ScriptText ?? "Chưa có lời thuyết minh.";
}