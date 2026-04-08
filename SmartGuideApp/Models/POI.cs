using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace SmartGuideApp.Models;

public class POI : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = new();

    public string ShortDescription { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    public double DistanceKm { get; set; }

    public string DistanceText =>
        DistanceKm < 1
            ? $"{(int)(DistanceKm * 1000)} m"
            : $"{DistanceKm:0.0} km";

    public string SuggestionDistanceText =>
        DistanceKm < 1
            ? $"{(int)(DistanceKm * 1000)}m"
            : $"{DistanceKm:0.0}km";

    public string ImageUrl { get; set; } = string.Empty;
    public string OpenHours { get; set; } = string.Empty;
    public string PriceText { get; set; } = string.Empty;

    private bool _isFavorite;
    public bool IsFavorite
    {
        get => _isFavorite;
        set
        {
            if (_isFavorite == value) return;
            _isFavorite = value;
            OnPropertyChanged();
        }
    }

    public int ListenedCount { get; set; }
    public List<AudioGuide> Audios { get; set; } = new();

    public double Latitude { get; set; }
    public double Longitude { get; set; }
}