using SmartGuideApp.Models;
using Microsoft.Maui.Devices.Sensors;

namespace SmartGuideApp.Services;

public class TrackingService
{
    private bool _isRunning = false;
    private HashSet<string> _triggeredPois = new();

    private Queue<POI> _poiQueue = new();
    private bool _isProcessing = false;

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
        foreach (var poi in pois)
        {
            if (_triggeredPois.Contains(poi.Id))
                continue;

            var distance = Location.CalculateDistance(
                userLocation,
                new Location(poi.Latitude, poi.Longitude),
                DistanceUnits.Kilometers
            );

            if (distance < 4) // Khoảng cách tracking (đơn vị km)
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

        while (_poiQueue.Count > 0)
        {
            var poi = _poiQueue.Dequeue();

            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await Shell.Current.GoToAsync($"//map");
                await Shell.Current.GoToAsync($"DetailPage?poiId={poi.Id}");
            });

            // đợi đọc xong (tạm)
            await Task.Delay(8000);
        }

        _isProcessing = false;
    }

}