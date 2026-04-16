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
    public async Task<IActionResult> GetPois([FromQuery] int userId)
    {
        var pois = await _db.Pois.ToListAsync();
        var poiImages = await _db.PoiImages.OrderBy(x => x.SortOrder).ToListAsync();
        var audioGuides = await _db.AudioGuides.ToListAsync();

        var favoritePoiIds = userId == 0
            ? new HashSet<string>()
            : (await _db.Favorites
                .Where(x => x.UserId == userId)
                .Select(x => x.PoiId)
                .ToListAsync())
            .ToHashSet();

        var result = pois.Select(p => new
        {
            p.Id,
            p.Name,
            p.Category,
            p.Description,
            p.Address,
            p.PriceText,
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
    public async Task<IActionResult> GetById(string id, [FromQuery] int userId)
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

        var isFavorite = userId != 0 && await _db.Favorites
            .AnyAsync(x => x.UserId == userId && x.PoiId == id);

        return Ok(new
        {
            poi.Id,
            poi.Name,
            poi.Category,
            poi.Description,
            poi.Address,
            poi.PriceText,
            poi.Latitude,
            poi.Longitude,
            listened_count = poi.ListenedCount,
            rating_avg = poi.RatingAvg,
            rating_count = poi.RatingCount,
            is_favorite = isFavorite,
            images,
            audios
        });
    }

    [HttpPost("favorite/{poiId}")]
    public async Task<IActionResult> ToggleFavorite(string poiId, [FromQuery] int userId, [FromQuery] bool isFavorite)
    {
        if (userId == 0)
            return BadRequest("Thiếu userId");

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound("Không tìm thấy user");

        var poi = await _db.Pois.FindAsync(poiId);
        if (poi == null)
            return NotFound("Không tìm thấy POI");

        var existing = await _db.Favorites
            .FirstOrDefaultAsync(x => x.UserId == userId && x.PoiId == poiId);

        if (isFavorite)
        {
            if (existing == null)
            {
                _db.Favorites.Add(new Favorite
                {
                    UserId = userId,
                    PoiId = poiId
                });

                user.FavoriteCount += 1;
            }
        }
        else
        {
            if (existing != null)
            {
                _db.Favorites.Remove(existing);

                if (user.FavoriteCount > 0)
                    user.FavoriteCount -= 1;
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            poiId,
            is_favorite = isFavorite,
            favorite_count = user.FavoriteCount
        });
    }

    [HttpPost("listened/{poiId}")]
    public async Task<IActionResult> IncreaseListened(string poiId, [FromQuery] int userId)
    {
        if (userId == 0)
            return BadRequest("Thiếu userId");

        var poi = await _db.Pois.FirstOrDefaultAsync(p => p.Id == poiId);
        if (poi == null) return NotFound();

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound("Không tìm thấy user");

        _db.ListenLogs.Add(new ListenLog
        {
            UserId = userId,
            PoiId = poiId
        });

        poi.ListenedCount += 1;
        user.ListenedPoiCount += 1;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            poiId = poi.Id,
            listened_count = poi.ListenedCount,
            user_listened = user.ListenedPoiCount
        });
    }
}