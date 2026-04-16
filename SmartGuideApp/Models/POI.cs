using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Text.Json.Serialization;
using SmartGuideApp.Models;

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

    private bool _isAudioPlaying;
    public bool IsAudioPlaying
    {
        get => _isAudioPlaying;
        set
        {
            if (_isAudioPlaying == value) return;
            _isAudioPlaying = value;
            OnPropertyChanged();
        }
    }

    public string OpenHours { get; set; } = string.Empty;
    public string PriceText { get; set; } = string.Empty;

    private bool _isFavorite;

    [JsonPropertyName("is_favorite")]
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

    private int _listenedCount;
    [JsonPropertyName("listened_count")]
    public int ListenedCount
    {
        get => _listenedCount;
        set
        {
            if (_listenedCount == value) return;
            _listenedCount = value;
            OnPropertyChanged();
        }
    }

    private double _ratingAvg;
    [JsonPropertyName("rating_avg")]
    public double RatingAvg
    {
        get => _ratingAvg;
        set
        {
            if (Math.Abs(_ratingAvg - value) < 0.0001) return;
            _ratingAvg = value;
            OnPropertyChanged();
        }
    }

    private int _ratingCount;
    [JsonPropertyName("rating_count")]
    public int RatingCount
    {
        get => _ratingCount;
        set
        {
            if (_ratingCount == value) return;
            _ratingCount = value;
            OnPropertyChanged();
        }
    }
    public List<AudioGuide> Audios { get; set; } = new();

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public List<string> Images { get; set; } = new();

    public string Thumbnail =>
        Images != null && Images.Count > 0
            ? $"http://192.168.22.4:5022{Images[0]}"
            : string.Empty;
}