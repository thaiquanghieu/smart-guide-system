using SmartGuideApp.Models;
using Microsoft.Maui.Devices.Sensors;

namespace SmartGuideApp.Services;

public class TrackingService
{
    private bool _isRunning = false;
    private HashSet<string> _triggeredPois = new();

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

            if (distance < 4) // Khoảng cách tracking (đơn vị: km)
            {
                _triggeredPois.Add(poi.Id);

                TriggerPoi(poi);
                break;
            }
        }
    }

    private async void TriggerPoi(POI poi)
    {
        try
        {
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await Shell.Current.GoToAsync($"DetailPage?poiId={poi.Id}");
            });
        }
        catch { }
    }
}