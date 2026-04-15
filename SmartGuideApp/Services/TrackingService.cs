using SmartGuideApp.Models;
using Microsoft.Maui.Devices.Sensors;

namespace SmartGuideApp.Services;

public class TrackingService
{
    private readonly AudioService _audioService = AudioService.Instance;
    private double _radiusKm = 0.2; // default 200m : khoảng cách để trigger
    private int _intervalMs = 5000; // default 5s : khoảng thời gian giữa 2 lần check vị trí
    private bool _isRunning = false;
    private HashSet<string> _triggeredPois = new();
    private string? _currentPoiId = null;

    public async Task StartTrackingAsync(List<POI> pois)
    {
        if (_isRunning) return;

        _isRunning = true;

        while (_isRunning)
        {
            try
            {
                var location = await Geolocation.GetLocationAsync()
                ?? await Geolocation.GetLastKnownLocationAsync();
                if (location != null)
                {
                    await CheckNearby(location, pois);
                }
            }
            catch { }

            await Task.Delay(_intervalMs);
        }
    }

    public void SetConfig(double radiusKm, int intervalMs)
    {
        _radiusKm = radiusKm;
        _intervalMs = intervalMs;
    }

    public void Stop()
    {
        _isRunning = false;
        _currentPoiId = null;
    }

    private async Task CheckNearby(Location userLocation, List<POI> pois)
    {
        POI? nearestPoi = null;
        double minDistance = double.MaxValue;

        foreach (var poi in pois)
        {
            // bỏ qua POI đã phát rồi
            if (_triggeredPois.Contains(poi.Id))
                continue;

            var distance = Location.CalculateDistance(
                userLocation,
                new Location(poi.Latitude, poi.Longitude),
                DistanceUnits.Kilometers
            );

            // chỉ xét POI trong bán kính và gần nhất
            if (distance < _radiusKm && distance < minDistance)
            {
                minDistance = distance;
                nearestPoi = poi;
            }
        }

        // không có POI phù hợp
        if (nearestPoi == null)
            return;

        // nếu đang phát audio thì bỏ qua (tránh spam)
        if (_audioService.IsPlaying)
            return;

        // đánh dấu POI hiện tại
        _currentPoiId = nearestPoi.Id;
        _triggeredPois.Add(nearestPoi.Id);

        await MainThread.InvokeOnMainThreadAsync(async () =>
        {
            // chuyển sang detail
            await Shell.Current.GoToAsync("//map");
            await Shell.Current.GoToAsync($"DetailPage?poiId={nearestPoi.Id}");

            // phát audio
            await _audioService.PlayAsync(nearestPoi);

            await Shell.Current.GoToAsync("..");

            // reset current poi sau khi phát xong
            _currentPoiId = null;
        });
    }

}