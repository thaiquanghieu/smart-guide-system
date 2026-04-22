using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController : ControllerBase
{
    private readonly AppDbContext _db;

    private static string NormalizeLanguage(string? lang)
    {
        return lang is "en" or "ja" or "ko" or "zh" ? lang : "vi";
    }

    public ProfilesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{deviceId}")]
    public async Task<IActionResult> GetProfile(int deviceId)
    {
        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null)
            return NotFound();

        var favoriteCount = await _db.Favorites.CountAsync(x => x.DeviceId == deviceId);
        var listenedPoiCount = await _db.ListenLogs.CountAsync(x => x.DeviceId == deviceId);

        return Ok(new
        {
            device.Id,
            DeviceName = string.IsNullOrWhiteSpace(device.Name) ? "Thiết bị Smart Guide" : device.Name,
            DeviceUuid = device.DeviceUuid,
            Platform = device.Platform,
            Model = device.Model,
            AppVersion = device.AppVersion,
            FavoriteCount = favoriteCount,
            ListenedPoiCount = listenedPoiCount
        });
    }

    [HttpGet("{deviceId}/favorites")]
    public async Task<IActionResult> GetFavorites(int deviceId, [FromQuery] string? lang)
    {
        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null)
            return NotFound();

        var language = NormalizeLanguage(lang);
        var favorites = await _db.Favorites
            .Where(x => x.DeviceId == deviceId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        var poiIds = favorites.Select(x => x.PoiId).Distinct().ToList();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var images = await _db.PoiImages
            .Where(x => poiIds.Contains(x.PoiId))
            .OrderBy(x => x.SortOrder)
            .ToListAsync();
        var translations = language == "vi"
            ? new List<PoiTranslation>()
            : await _db.PoiTranslations
                .Where(x => poiIds.Contains(x.PoiId) && x.LanguageCode == language)
                .ToListAsync();

        var result = favorites
            .Select(favorite =>
            {
                var poi = pois.FirstOrDefault(x => x.Id == favorite.PoiId);
                if (poi == null) return null;

                var translation = translations.FirstOrDefault(x => x.PoiId == poi.Id);

                return new
                {
                    poi.Id,
                    Name = translation?.Name ?? poi.Name,
                    Category = translation?.Category ?? poi.Category,
                    Address = translation?.Address ?? poi.Address,
                    ImageUrl = images.FirstOrDefault(x => x.PoiId == poi.Id)?.ImageUrl ?? "",
                    listened_count = poi.ListenedCount,
                    rating_avg = poi.RatingAvg,
                    created_at = favorite.CreatedAt
                };
            })
            .Where(x => x != null)
            .ToList();

        return Ok(result);
    }

    [HttpGet("{deviceId}/history")]
    public async Task<IActionResult> GetListenHistory(int deviceId, [FromQuery] string? lang)
    {
        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null)
            return NotFound();

        var language = NormalizeLanguage(lang);
        var historyGroups = await _db.ListenLogs
            .Where(x => x.DeviceId == deviceId)
            .GroupBy(x => x.PoiId)
            .Select(group => new
            {
                PoiId = group.Key,
                ListenCount = group.Count(),
                LastListenedAt = group.Max(x => x.ListenedAt)
            })
            .OrderByDescending(x => x.LastListenedAt)
            .ToListAsync();

        var poiIds = historyGroups.Select(x => x.PoiId).Distinct().ToList();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var images = await _db.PoiImages
            .Where(x => poiIds.Contains(x.PoiId))
            .OrderBy(x => x.SortOrder)
            .ToListAsync();
        var translations = language == "vi"
            ? new List<PoiTranslation>()
            : await _db.PoiTranslations
                .Where(x => poiIds.Contains(x.PoiId) && x.LanguageCode == language)
                .ToListAsync();

        var result = historyGroups
            .Select(history =>
            {
                var poi = pois.FirstOrDefault(x => x.Id == history.PoiId);
                if (poi == null) return null;

                var translation = translations.FirstOrDefault(x => x.PoiId == poi.Id);

                return new
                {
                    poi.Id,
                    Name = translation?.Name ?? poi.Name,
                    Category = translation?.Category ?? poi.Category,
                    Address = translation?.Address ?? poi.Address,
                    ImageUrl = images.FirstOrDefault(x => x.PoiId == poi.Id)?.ImageUrl ?? "",
                    listened_count = poi.ListenedCount,
                    rating_avg = poi.RatingAvg,
                    listen_count = history.ListenCount,
                    last_listened_at = history.LastListenedAt
                };
            })
            .Where(x => x != null)
            .ToList();

        return Ok(result);
    }
}
