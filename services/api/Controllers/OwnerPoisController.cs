using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/owner/pois")]
public class OwnerPoisController : ControllerBase
{
    private readonly AppDbContext _db;

    public OwnerPoisController(AppDbContext db)
    {
        _db = db;
    }

    // =========================
    // GET POIs BY OWNER
    // =========================
    [HttpGet]
    public async Task<IActionResult> GetMyPois([FromQuery] int ownerId)
    {
        var pois = await _db.Pois
            .Where(x => x.OwnerId == ownerId)
            .Include(p => p.OwnerId)
            .ToListAsync();

        var poiImages = await _db.PoiImages.OrderBy(x => x.SortOrder).ToListAsync();
        var audioGuides = await _db.AudioGuides.ToListAsync();

        var result = pois.Select(p => new
        {
            p.Id,
            p.Name,
            p.Description,
            p.Address,
            p.Radius,
            p.Priority,
            p.Status,
            p.Latitude,
            p.Longitude,
            listened_count = p.ListenedCount,
            rating_avg = p.RatingAvg,
            rating_count = p.RatingCount,
            created_at = p.CreatedAt,
            updated_at = p.UpdatedAt,

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
                    a.ScriptText
                })
                .ToList()
        });

        return Ok(result);
    }

    // =========================
    // GET POI BY ID (Owner Only)
    // =========================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPoi(string id, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền truy cập POI này");

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
                a.ScriptText
            })
            .ToListAsync();

        return Ok(new
        {
            poi.Id,
            poi.Name,
            poi.Description,
            poi.Address,
            poi.Radius,
            poi.Priority,
            poi.Status,
            poi.Latitude,
            poi.Longitude,
            listened_count = poi.ListenedCount,
            rating_avg = poi.RatingAvg,
            rating_count = poi.RatingCount,
            created_at = poi.CreatedAt,
            images,
            audios
        });
    }

    // =========================
    // CREATE POI
    // =========================
    [HttpPost]
    public async Task<IActionResult> CreatePoi([FromBody] CreatePoiRequest request, [FromQuery] int ownerId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên POI không được để trống" });

        if (request.Latitude < -90 || request.Latitude > 90)
            return BadRequest(new { message = "Latitude không hợp lệ" });

        if (request.Longitude < -180 || request.Longitude > 180)
            return BadRequest(new { message = "Longitude không hợp lệ" });

        var user = await _db.Users.FindAsync(ownerId);
        if (user == null || user.Role != "owner")
            return Forbid("Chỉ owner mới có thể tạo POI");

        var poi = new Poi
        {
            Id = Guid.NewGuid().ToString("N").Substring(0, 20),
            OwnerId = ownerId,
            Name = request.Name,
            Description = request.Description,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Radius = request.Radius ?? 100,
            Priority = request.Priority ?? 0,
            Status = "pending",
            Category = request.Category ?? "Khác",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Pois.Add(poi);
        await _db.SaveChangesAsync();

        return Ok(new { poi.Id, message = "POI được tạo thành công" });
    }

    // =========================
    // UPDATE POI
    // =========================
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePoi(string id, [FromBody] UpdatePoiRequest request, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền sửa POI này");

        if (!string.IsNullOrWhiteSpace(request.Name))
            poi.Name = request.Name;

        if (!string.IsNullOrWhiteSpace(request.Description))
            poi.Description = request.Description;

        if (!string.IsNullOrWhiteSpace(request.Address))
            poi.Address = request.Address;

        if (request.Latitude.HasValue)
            poi.Latitude = request.Latitude.Value;

        if (request.Longitude.HasValue)
            poi.Longitude = request.Longitude.Value;

        if (request.Radius.HasValue)
            poi.Radius = request.Radius.Value;

        if (request.Priority.HasValue)
            poi.Priority = request.Priority.Value;

        if (!string.IsNullOrWhiteSpace(request.Category))
            poi.Category = request.Category;

        poi.UpdatedAt = DateTime.UtcNow;

        _db.Pois.Update(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI được cập nhật thành công" });
    }

    // =========================
    // DELETE POI
    // =========================
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePoi(string id, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền xóa POI này");

        _db.Pois.Remove(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI được xóa thành công" });
    }

    // =========================
    // GET ANALYTICS
    // =========================
    [HttpGet("analytics/summary")]
    public async Task<IActionResult> GetAnalytics([FromQuery] int ownerId)
    {
        var user = await _db.Users.FindAsync(ownerId);
        if (user == null)
            return NotFound();

        var pois = await _db.Pois.Where(x => x.OwnerId == ownerId).ToListAsync();
        var poisIds = pois.Select(x => x.Id).ToList();

        var totalListens = await _db.ListenLogs
            .Where(x => poisIds.Contains(x.PoiId))
            .CountAsync();

        var topPois = pois
            .OrderByDescending(x => x.ListenedCount)
            .Take(5)
            .Select(x => new { x.Id, x.Name, listened_count = x.ListenedCount });

        var avgDuration = await _db.ListenLogs
            .Where(x => poisIds.Contains(x.PoiId))
            .AverageAsync(x => (double?)x.DurationSeconds) ?? 0;

        return Ok(new
        {
            total_pois = pois.Count,
            total_listens = totalListens,
            avg_duration_seconds = (int)avgDuration,
            top_pois = topPois
        });
    }
}

public class CreatePoiRequest
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Address { get; set; } = "";
    public string? Category { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int? Radius { get; set; }
    public int? Priority { get; set; }
}

public class UpdatePoiRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? Category { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? Radius { get; set; }
    public int? Priority { get; set; }
}
