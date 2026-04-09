using SmartGuideApp.Models;
using Microsoft.Maui.Devices.Sensors;

namespace SmartGuideApp.Services;

public class TrackingService
{
    private bool _isRunning = false;
    private HashSet<string> _triggeredPois = new();

    private Queue<POI> _poiQueue = new();
    private bool _isProcessing = false;

    private readonly AudioService _audioService = new();

    public async Task StartTrackingAsync(List<POI> pois)
    {
        if (_isRunning) return;

        _isRunning = true;

        while (_isRunning)
        {
            try
            {
                var location = await Geolocation.GetLastKnownLocationAsync();
                if (location != null)
                {
                    CheckNearby(location, pois);
                }
            }
            catch { }

            await Task.Delay(5000); // 5s
        }
    }

    public void Stop()
    {
        _isRunning = false;
    }

    private void CheckNearby(Location userLocation, List<POI> pois)
    {
        if (_isProcessing)
            return;

        foreach (var poi in pois)
        {
            if (_triggeredPois.Contains(poi.Id))
                continue;

            var distance = Location.CalculateDistance(
                userLocation,
                new Location(poi.Latitude, poi.Longitude),
                DistanceUnits.Kilometers
            );

            if (distance < 0.5) // Khoảng cách tracking (đơn vị km)
            {
                _triggeredPois.Add(poi.Id);
                _poiQueue.Enqueue(poi);
            }
        }

        ProcessQueue();
    }

    private async void ProcessQueue()
    {
        if (_isProcessing || _poiQueue.Count == 0)
            return;

        _isProcessing = true;

        var batch = new List<POI>();
        while (_poiQueue.Count > 0)
        {
            batch.Add(_poiQueue.Dequeue());
        }

        foreach (var poi in batch)
        {
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await Shell.Current.GoToAsync($"//map");
                await Shell.Current.GoToAsync($"DetailPage?poiId={poi.Id}");
            });

            await Task.Delay(500);
            await WaitForAudioFinished();
            await Task.Delay(800);
        }

        _isProcessing = false;
    }

    private async Task WaitForAudioFinished()
    {
        // đợi audio start
        int waitStart = 0;
        while (!AudioService.Instance.IsPlaying && waitStart < 30)
        {
            await Task.Delay(100);
            waitStart++;
        }

        // nếu chưa start được → bỏ qua luôn
        if (!AudioService.Instance.IsPlaying)
            return;

        // đợi audio chạy ổn định ít nhất 1s
        await Task.Delay(1000);

        // đợi kết thúc
        while (AudioService.Instance.IsPlaying)
        {
            await Task.Delay(300);
        }
    }

}