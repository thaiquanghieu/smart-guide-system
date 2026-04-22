using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PoisController : ControllerBase
{
    private readonly AppDbContext _db;

    public PoisController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPois([FromQuery] int deviceId)
    {
        var pois = await _db.Pois.ToListAsync();
        var poiImages = await _db.PoiImages.OrderBy(x => x.SortOrder).ToListAsync();
        var audioGuides = await _db.AudioGuides.ToListAsync();

        var favoritePoiIds = deviceId == 0
            ? new HashSet<string>()
            : (await _db.Favorites
                .Where(x => x.DeviceId == deviceId)
                .Select(x => x.PoiId)
                .ToListAsync())
            .ToHashSet();

        var result = pois.Select(p => new
        {
            p.Id,
            p.Name,
            p.Category,
            short_description = p.ShortDescription,
            p.Description,
            p.Address,
            p.PriceText,
            open_time = p.OpenTime,
            close_time = p.CloseTime,
            open_hours = $"{p.OpenTime} - {p.CloseTime}",
            p.Latitude,
            p.Longitude,
            listened_count = p.ListenedCount,
            rating_avg = p.RatingAvg,
            rating_count = p.RatingCount,
            is_favorite = favoritePoiIds.Contains(p.Id),

            images = poiImages
                .Where(i => i.PoiId == p.Id)
                .OrderBy(i => i.SortOrder)
                .Select(i => i.ImageUrl)
                .ToList(),

            audios = audioGuides
                .Where(a => a.PoiId == p.Id)
                .Select(a => new
                {
                    a.Id,
                    a.LanguageCode,
                    a.LanguageName,
                    a.VoiceName,
                    a.ScriptText
                })
                .ToList()
        });

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, [FromQuery] int deviceId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);
        if (poi == null) return NotFound();

        var images = await _db.PoiImages
            .Where(i => i.PoiId == id)
            .OrderBy(i => i.SortOrder)
            .Select(i => i.ImageUrl)
            .ToListAsync();

        var audios = await _db.AudioGuides
            .Where(a => a.PoiId == id)
            .Select(a => new
            {
                a.Id,
                a.LanguageCode,
                a.LanguageName,
                a.VoiceName,
                a.ScriptText
            })
            .ToListAsync();

        var isFavorite = deviceId != 0 && await _db.Favorites
            .AnyAsync(x => x.DeviceId == deviceId && x.PoiId == id);

        var userRating = deviceId == 0
            ? 0
            : await _db.Ratings
                .Where(x => x.DeviceId == deviceId && x.PoiId == id)
                .Select(x => (int?)x.RatingValue)
                .FirstOrDefaultAsync() ?? 0;

        return Ok(new
        {
            poi.Id,
            poi.Name,
            poi.Category,
            short_description = poi.ShortDescription,
            poi.Description,
            poi.Address,
            poi.PriceText,
            open_time = poi.OpenTime,
            close_time = poi.CloseTime,
            open_hours = $"{poi.OpenTime} - {poi.CloseTime}",
            poi.Latitude,
            poi.Longitude,
            listened_count = poi.ListenedCount,
            rating_avg = poi.RatingAvg,
            rating_count = poi.RatingCount,
            user_rating = userRating,
            is_favorite = isFavorite,
            images,
            audios
        });
    }

    [HttpPost("favorite/{poiId}")]
    public async Task<IActionResult> ToggleFavorite(string poiId, [FromQuery] int deviceId, [FromQuery] bool isFavorite)
    {
        if (deviceId == 0)
            return BadRequest("Thiếu deviceId");

        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null || !device.IsActive)
            return NotFound("Không tìm thấy thiết bị");

        var poi = await _db.Pois.FindAsync(poiId);
        if (poi == null)
            return NotFound("Không tìm thấy POI");

        var existing = await _db.Favorites
            .FirstOrDefaultAsync(x => x.DeviceId == deviceId && x.PoiId == poiId);

        if (isFavorite)
        {
            if (existing == null)
            {
                _db.Favorites.Add(new Favorite
                {
                    DeviceId = deviceId,
                    PoiId = poiId
                });
            }
        }
        else
        {
            if (existing != null)
            {
                _db.Favorites.Remove(existing);
            }
        }

        await _db.SaveChangesAsync();

        var favoriteCount = await _db.Favorites.CountAsync(x => x.DeviceId == deviceId);

        return Ok(new
        {
            poiId,
            is_favorite = isFavorite,
            favorite_count = favoriteCount
        });
    }

    [HttpPost("listened/{poiId}")]
    public async Task<IActionResult> IncreaseListened(string poiId, [FromQuery] int deviceId)
    {
        if (deviceId == 0)
            return BadRequest("Thiếu deviceId");

        var poi = await _db.Pois.FirstOrDefaultAsync(p => p.Id == poiId);
        if (poi == null) return NotFound();

        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null || !device.IsActive) return NotFound("Không tìm thấy thiết bị");

        _db.ListenLogs.Add(new ListenLog
        {
            DeviceId = deviceId,
            PoiId = poiId
        });

        poi.ListenedCount += 1;

        await _db.SaveChangesAsync();

        var deviceListened = await _db.ListenLogs.CountAsync(x => x.DeviceId == deviceId);

        return Ok(new
        {
            poiId = poi.Id,
            listened_count = poi.ListenedCount,
            device_listened = deviceListened
        });
    }
}
