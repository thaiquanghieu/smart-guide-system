using SmartGuideApp.Models;
using Microsoft.Maui.Media;

namespace SmartGuideApp.Services;

public class AudioService
{
    public static AudioService Instance { get; } = new();

    private CancellationTokenSource? _cts;
    private POI? _currentPoi;

    public POI? CurrentPoi => _currentPoi;
    public bool IsPlaying => _currentPoi?.IsAudioPlaying == true;

    public async Task PlayAsync(POI poi)
    {
        var script = poi.Audios.FirstOrDefault()?.ScriptText;
        if (string.IsNullOrWhiteSpace(script))
            return;

        // nếu đang play cùng POI → stop
        if (_currentPoi == poi && poi.IsAudioPlaying)
        {
            Stop();
            return;
        }

        Stop();

        var cts = new CancellationTokenSource();
        _cts = cts;
        _currentPoi = poi;
        poi.IsAudioPlaying = true;

        try
        {
            await TextToSpeech.SpeakAsync(
                script,
                new SpeechOptions
                {
                    Volume = 1.0f,
                    Pitch = 1.0f
                },
                cts.Token);
        }
        catch { }
        finally
        {
            if (_cts == cts)
            {
                poi.IsAudioPlaying = false;

                try
                {
                    var api = new ApiService();
                    await api.IncreaseListenedAsync(poi.Id);
                }
                catch { }

                _currentPoi = null;
                _cts = null;
            }
        }
    }

    public void Stop()
    {
        _cts?.Cancel();

        if (_currentPoi != null)
            _currentPoi.IsAudioPlaying = false;

        _currentPoi = null;
        _cts = null;
    }
}