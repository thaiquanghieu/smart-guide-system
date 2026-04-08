using SmartGuideApp.Models;
using System.Windows.Input;
using Microsoft.Maui.Media;

namespace SmartGuideApp.ViewModels;

public class DetailViewModel : BaseViewModel
{
    private POI? _poi;
    private CancellationTokenSource? _cts;
    private CancellationTokenSource? _progressCts;
    private bool _isPlaying;
    private double _playbackProgress;
    private int _estimatedDurationSeconds = 0;

    public POI? Poi
    {
        get => _poi;
        set
        {
            if (SetProperty(ref _poi, value))
            {
                _estimatedDurationSeconds = ParseDurationToSeconds(Poi?.Audios.FirstOrDefault()?.DurationText);

                OnPropertyChanged(nameof(Title));
                OnPropertyChanged(nameof(Category));
                OnPropertyChanged(nameof(Address));
                OnPropertyChanged(nameof(ImageUrl));
                OnPropertyChanged(nameof(Description));
                OnPropertyChanged(nameof(OpenHours));
                OnPropertyChanged(nameof(PriceText));
                OnPropertyChanged(nameof(DistanceText));
                OnPropertyChanged(nameof(RatingText));
                OnPropertyChanged(nameof(AudioVoice));
                OnPropertyChanged(nameof(AudioDuration));
                OnPropertyChanged(nameof(ScriptText));
                OnPropertyChanged(nameof(CurrentTimeText));
                OnPropertyChanged(nameof(RemainingTimeText));
                OnPropertyChanged(nameof(IsFavorite));
                OnPropertyChanged(nameof(FavoriteIcon));
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
    public string DistanceText => Poi?.DistanceText ?? string.Empty;
    public string RatingText => "4.8";

    public string AudioVoice => "TTS";
    public string AudioDuration => Poi?.Audios.FirstOrDefault()?.DurationText ?? "--:--";
    public string ScriptText => Poi?.Audios.FirstOrDefault()?.ScriptText ?? "Chưa có lời thuyết minh.";

    public bool IsPlaying
    {
        get => _isPlaying;
        set
        {
            if (SetProperty(ref _isPlaying, value))
            {
                OnPropertyChanged(nameof(AudioToggleIcon));
            }
        }
    }

    public string AudioToggleIcon => IsPlaying ? "audio.png" : "audio2.png";

    public double PlaybackProgress
    {
        get => _playbackProgress;
        set
        {
            var clamped = Math.Max(0, Math.Min(100, value));
            if (SetProperty(ref _playbackProgress, clamped))
            {
                OnPropertyChanged(nameof(CurrentTimeText));
                OnPropertyChanged(nameof(RemainingTimeText));
            }
        }
    }

    public string CurrentTimeText => FormatSeconds(GetCurrentSeconds());

    public string RemainingTimeText
    {
        get
        {
            var remaining = Math.Max(0, _estimatedDurationSeconds - GetCurrentSeconds());
            return FormatSeconds(remaining);
        }
    }

    public bool IsFavorite
    {
        get => Poi?.IsFavorite ?? false;
        set
        {
            if (Poi == null) return;

            Poi.IsFavorite = value;
            OnPropertyChanged(nameof(IsFavorite));
            OnPropertyChanged(nameof(FavoriteIcon));
        }
    }

    public string FavoriteIcon => IsFavorite ? "favorite_active.png" : "favorite.png";

    public ICommand TogglePlayCommand { get; }
    public ICommand SeekCommand { get; }
    public ICommand ToggleFavoriteCommand { get; }

    public DetailViewModel()
    {
        TogglePlayCommand = new Command(async () => await TogglePlayAsync());
        SeekCommand = new Command<double>(OnSeekRequested);
        ToggleFavoriteCommand = new Command(() => IsFavorite = !IsFavorite);
    }

    private async Task TogglePlayAsync()
    {
        if (IsPlaying)
        {
            StopAudio(resetProgress: false);
            return;
        }

        if (string.IsNullOrWhiteSpace(ScriptText))
            return;

        try
        {
            _cts?.Cancel();
            _progressCts?.Cancel();

            _cts = new CancellationTokenSource();
            _progressCts = new CancellationTokenSource();

            IsPlaying = true;
            _ = RunProgressAsync(_progressCts.Token);

            await TextToSpeech.SpeakAsync(
                ScriptText,
                new SpeechOptions
                {
                    Volume = 1.0f,
                    Pitch = 1.0f
                },
                _cts.Token);
        }
        catch
        {
        }
        finally
        {
            IsPlaying = false;
            _progressCts?.Cancel();
            PlaybackProgress = 0;
        }
    }

    private async Task RunProgressAsync(CancellationToken token)
    {
        if (_estimatedDurationSeconds <= 0)
            _estimatedDurationSeconds = 1;

        var intervalMs = 250;
        var totalMs = _estimatedDurationSeconds * 1000.0;
        var elapsedMs = PlaybackProgress / 100.0 * totalMs;

        while (!token.IsCancellationRequested && elapsedMs < totalMs)
        {
            await Task.Delay(intervalMs, token);
            elapsedMs += intervalMs;
            PlaybackProgress = elapsedMs / totalMs * 100.0;
        }

        PlaybackProgress = 100;
    }

    private void OnSeekRequested(double newValue)
    {
        PlaybackProgress = newValue;
    }

    private void StopAudio(bool resetProgress)
    {
        _cts?.Cancel();
        _progressCts?.Cancel();
        IsPlaying = false;

        if (resetProgress)
            PlaybackProgress = 0;
    }

    private int GetCurrentSeconds()
    {
        if (_estimatedDurationSeconds <= 0)
            return 0;

        return (int)Math.Round(_estimatedDurationSeconds * (PlaybackProgress / 100.0));
    }

    private static int ParseDurationToSeconds(string? durationText)
    {
        if (string.IsNullOrWhiteSpace(durationText))
            return 0;

        var parts = durationText.Split(':');
        if (parts.Length != 2)
            return 0;

        if (int.TryParse(parts[0], out var minutes) && int.TryParse(parts[1], out var seconds))
            return minutes * 60 + seconds;

        return 0;
    }

    private static string FormatSeconds(int totalSeconds)
    {
        var minutes = totalSeconds / 60;
        var seconds = totalSeconds % 60;
        return $"{minutes:00}:{seconds:00}";
    }
}