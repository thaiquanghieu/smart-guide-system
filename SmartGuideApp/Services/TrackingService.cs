using SmartGuideApp.Models;
using Microsoft.Maui.Devices.Sensors;

namespace SmartGuideApp.Services;

public class TrackingService
{
    public event Action<string>? OnPoiDetected;
    private readonly AudioService _audioService = AudioService.Instance;

    private double _radiusKm = 0.2; // default 200m : bán kính trigger POI gần nhất
    private int _intervalMs = 5000; // default 5s : khoảng thời gian giữa 2 lần check vị trí
    private bool _isRunning = false;

    // cooldown: POI nào đã phát thì lưu thời điểm phát cuối
    private readonly Dictionary<string, DateTime> _lastTriggeredAt = new();

    // debounce: phải thấy cùng 1 POI đủ số lần liên tiếp mới trigger
    private string? _pendingPoiId = null;
    private int _pendingPoiHitCount = 0;
    private const int RequiredHits = 3;

    // cooldown mặc định: 2 phút
    private readonly TimeSpan _cooldown = TimeSpan.FromMinutes(2);

    private string? _currentPoiId = null;
    private bool _isHandlingPoi = false;
    private bool _isFirstFix = true;

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
        _pendingPoiId = null;
        _pendingPoiHitCount = 0;
    }

    private async Task CheckNearby(Location userLocation, List<POI> pois)
    {
        if (_isHandlingPoi)
            return; 
        POI? nearestPoi = null;
        double minDistance = double.MaxValue;
        var now = DateTime.UtcNow;

        foreach (var poi in pois)
        {
            var distance = Location.CalculateDistance(
                userLocation,
                new Location(poi.Latitude, poi.Longitude),
                DistanceUnits.Kilometers
            );

            // chỉ xét POI trong bán kính và gần nhất
            if (distance < _radiusKm && distance < minDistance)
            {
                // nếu đang trong cooldown thì bỏ qua
                if (_lastTriggeredAt.TryGetValue(poi.Id, out var lastTime))
                {
                    if (now - lastTime < _cooldown)
                        continue;
                }

                minDistance = distance;
                nearestPoi = poi;
            }
        }

        // không có POI phù hợp
        if (nearestPoi == null)
        {
            _pendingPoiId = null;
            _pendingPoiHitCount = 0;
            return;
        }

        // nếu đang phát audio thì bỏ qua
        if (_audioService.IsPlaying)
            return;

        // debounce: phải thấy cùng 1 POI đủ số lần liên tiếp mới trigger
        if (_pendingPoiId == nearestPoi.Id)
        {
            _pendingPoiHitCount++;
        }
        else
        {
            _pendingPoiId = nearestPoi.Id;
            _pendingPoiHitCount = 1;
            return;
        }

        int requiredHits = _isFirstFix ? 1 : RequiredHits;

        if (_pendingPoiHitCount < requiredHits)
        return;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             

        // reset debounce state trước khi trigger
        _pendingPoiId = null;
        _pendingPoiHitCount = 0;

        _currentPoiId = nearestPoi.Id;
        _lastTriggeredAt[nearestPoi.Id] = now;
        _isHandlingPoi = true;
        _isFirstFix = false;
        
        OnPoiDetected?.Invoke(nearestPoi.Id);

        await MainThread.InvokeOnMainThreadAsync(async () =>
        {
            await Shell.Current.GoToAsync($"//map?poiId={nearestPoi.Id}");

            await _audioService.PlayAsync(nearestPoi);  

            _currentPoiId = null;
            _isHandlingPoi = false;
        });
    }

}