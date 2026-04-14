using SmartGuideApp.Models;
using Microsoft.Maui.Devices.Sensors;

namespace SmartGuideApp.Services;

public static class DistanceService
{
    public static async Task UpdateDistancesAsync(IEnumerable<POI> pois)
    {
        if (pois == null)
            return;

        Location? userLocation = await GetBestLocationAsync();
        if (userLocation == null)
            return;

        foreach (var poi in pois)
        {
            if (poi == null)
                continue;

            poi.DistanceKm = Location.CalculateDistance(
                userLocation,
                new Location(poi.Latitude, poi.Longitude),
                DistanceUnits.Kilometers
            );
        }
    }

    private static async Task<Location?> GetBestLocationAsync()
    {
        try
        {
            var lastKnown = await Geolocation.GetLastKnownLocationAsync();
            if (lastKnown != null)
                return lastKnown;

            var request = new GeolocationRequest(GeolocationAccuracy.Medium, TimeSpan.FromSeconds(10));
            return await Geolocation.GetLocationAsync(request);
        }
        catch
        {
            return null;
        }
    }
}