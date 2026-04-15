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
    public async Task<IActionResult> GetPois()
    {
        var pois = await _db.Pois
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Category,
                x.Description,
                x.Address,
                x.PriceText,
                x.Latitude,
                x.Longitude
            })
            .ToListAsync();

        var poiImages = await _db.PoiImages
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        var audioGuides = await _db.AudioGuides
        .ToListAsync();

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
    public async Task<IActionResult> GetById(string id)
    {
        var poi = await _db.Pois
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Category,
                x.Description,
                x.Address,
                x.PriceText,
                x.Latitude,
                x.Longitude
            })
            .FirstOrDefaultAsync();

        if (poi == null)
            return NotFound();

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
            images,
            audios
        });
    }

    [HttpPost("favorite/{poiId}")]
    public async Task<IActionResult> ToggleFavorite(string poiId, [FromQuery] bool isFavorite)
    {
        var profile = await _db.Profiles.FirstOrDefaultAsync();
        if (profile == null) return NotFound();

        if (isFavorite)
            profile.FavoriteCount += 1;
        else
            profile.FavoriteCount -= 1;

        await _db.SaveChangesAsync();
        return Ok(profile.FavoriteCount);
    }

    [HttpPost("listened/{poiId}")]
    public async Task<IActionResult> IncreaseListened(string poiId)
    {
        var profile = await _db.Profiles.FirstOrDefaultAsync();
        if (profile == null) return NotFound();

        profile.ListenedPoiCount += 1;

        await _db.SaveChangesAsync();
        return Ok(profile.ListenedPoiCount);
    }
}