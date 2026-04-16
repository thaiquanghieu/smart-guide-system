using System.Linq;
using SmartGuideApp.Models;
using Microsoft.Maui.Media;
using Microsoft.Maui.Storage;

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
        var lang = Preferences.Get("audio_lang", "vi");

        var audio = poi.Audios
            .FirstOrDefault(a => a.LanguageCode == lang)
            ?? poi.Audios.FirstOrDefault(a => a.LanguageCode == "vi")
            ?? poi.Audios.FirstOrDefault();

        var script = audio?.ScriptText;
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

        // Increment listened count immediately when playback starts so UI can reflect it.
        try
        {
            var api = new ApiService();
            var newCount = await api.IncreaseListenedAsync(poi.Id);
            if (newCount.HasValue)
            {
                poi.ListenedCount = newCount.Value;
            }
        }
        catch { }

        try
        {
            // Try to select a matching Locale/voice for the preferred language so TTS speaks correctly.
            // This queries available locales on the device and picks one that matches the language code (eg. "en" -> "en-US").
            Microsoft.Maui.Media.SpeechOptions options = new Microsoft.Maui.Media.SpeechOptions
            {
                Volume = 1.0f,
                Pitch = 1.0f
            };

            try
            {
                var locales = await TextToSpeech.GetLocalesAsync();
                if (locales != null && locales.Any())
                {
                    // first try exact match like "en-US" or "vi-VN" when stored in preferences
                    var exact = locales.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Language) && l.Language.Equals(lang, StringComparison.OrdinalIgnoreCase));
                    if (exact == null)
                    {
                        // then try match by prefix like "en" matches "en-US"
                        exact = locales.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Language) && l.Language.StartsWith(lang, StringComparison.OrdinalIgnoreCase));
                    }

                    if (exact != null)
                    {
                        options.Locale = exact;
                    }
                }
            }
            catch
            {
                // ignore locale discovery errors — we'll fallback to system default
            }

            await TextToSpeech.SpeakAsync(
                script,
                options,
                cts.Token);
        }
        catch { }
        finally
        {
            if (_cts == cts)
            {
                poi.IsAudioPlaying = false;
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