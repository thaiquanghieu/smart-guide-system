using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RatingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RatingsController(AppDbContext db)
    {
        _db = db;
    }

    public class RatingDto
    {
        public string PoiId { get; set; } = string.Empty;
        public int UserId { get; set; }
        public short RatingValue { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> UpsertRating([FromBody] RatingDto dto)
    {
        if (dto.RatingValue < 1 || dto.RatingValue > 5)
            return BadRequest("rating_value must be between 1 and 5");

        var poi = await _db.Pois.FirstOrDefaultAsync(p => p.Id == dto.PoiId);
        if (poi == null) return NotFound("poi not found");

        var user = await _db.Users.FindAsync(dto.UserId);
        if (user == null) return NotFound("user not found");

        var existing = await _db.Ratings.FirstOrDefaultAsync(r => r.PoiId == dto.PoiId && r.UserId == dto.UserId);
        if (existing == null)
        {
            var rating = new Rating
            {
                PoiId = dto.PoiId,
                UserId = dto.UserId,
                RatingValue = dto.RatingValue,
                CreatedAt = DateTime.UtcNow
            };
            _db.Ratings.Add(rating);
        }
        else
        {
            existing.RatingValue = dto.RatingValue;
            existing.CreatedAt = DateTime.UtcNow;
        }

        // recompute aggregates from ratings table after save
        await _db.SaveChangesAsync();

        var stats = await _db.Ratings
            .Where(r => r.PoiId == dto.PoiId)
            .GroupBy(r => r.PoiId)
            .Select(g => new { count = g.Count(), avg = g.Average(r => r.RatingValue) })
            .FirstOrDefaultAsync();

        if (stats != null)
        {
            poi.RatingCount = stats.count;
            poi.RatingAvg = Math.Round(stats.avg, 2);
            await _db.SaveChangesAsync();
        }

        return Ok(new { poiId = dto.PoiId, rating_count = poi.RatingCount, rating_avg = poi.RatingAvg });
    }
}
