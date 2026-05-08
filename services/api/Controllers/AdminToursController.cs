using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/admin/tours")]
public class AdminToursController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminToursController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetTours([FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var tours = await _db.Tours
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync();
        var tourIds = tours.Select(x => x.Id).ToList();
        var tourPois = tourIds.Count == 0
            ? new List<TourPoi>()
            : await _db.TourPois
                .Where(x => tourIds.Contains(x.TourId))
                .OrderBy(x => x.SortOrder)
                .ToListAsync();
        var poiIds = tourPois.Select(x => x.PoiId).Distinct().ToList();
        var pois = poiIds.Count == 0
            ? new List<Poi>()
            : await _db.Pois
                .Where(x => poiIds.Contains(x.Id))
                .ToListAsync();
        var poiImages = poiIds.Count == 0
            ? new List<PoiImage>()
            : await _db.PoiImages
                .Where(x => poiIds.Contains(x.PoiId))
                .OrderBy(x => x.SortOrder)
                .ToListAsync();

        return Ok(tours.Select(tour => BuildAdminTourResponse(tour, tourPois, pois, poiImages)));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTour([FromBody] SaveTourRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var normalizedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
            return BadRequest(new { message = "Tên tour là bắt buộc" });

        var normalizedPoiIds = NormalizePoiIds(request.PoiIds);
        if (normalizedPoiIds.Count == 0)
            return BadRequest(new { message = "Tour phải có ít nhất một POI" });

        var activePoiIds = await _db.Pois
            .Where(x => normalizedPoiIds.Contains(x.Id) && x.Status == "approved")
            .Select(x => x.Id)
            .ToListAsync();

        if (activePoiIds.Count != normalizedPoiIds.Count)
            return BadRequest(new { message = "Danh sách POI chứa mục không hợp lệ hoặc chưa được duyệt" });

        var now = DateTime.UtcNow;
        var tour = new Tour
        {
            Name = normalizedName,
            Description = request.Description?.Trim() ?? "",
            CoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl) ? null : request.CoverImageUrl.Trim(),
            IsPublished = request.IsPublished,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Tours.Add(tour);
        await _db.SaveChangesAsync();

        _db.TourPois.AddRange(normalizedPoiIds.Select((poiId, index) => new TourPoi
        {
            TourId = tour.Id,
            PoiId = poiId,
            SortOrder = index
        }));

        await _db.SaveChangesAsync();
        return await GetTourDetailInternalAsync(tour.Id);
    }

    [HttpPut("{tourId}")]
    public async Task<IActionResult> UpdateTour(int tourId, [FromBody] SaveTourRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var tour = await _db.Tours.FindAsync(tourId);
        if (tour == null)
            return NotFound(new { message = "Tour không tồn tại" });

        var normalizedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
            return BadRequest(new { message = "Tên tour là bắt buộc" });

        var normalizedPoiIds = NormalizePoiIds(request.PoiIds);
        if (normalizedPoiIds.Count == 0)
            return BadRequest(new { message = "Tour phải có ít nhất một POI" });

        var activePoiIds = await _db.Pois
            .Where(x => normalizedPoiIds.Contains(x.Id) && x.Status == "approved")
            .Select(x => x.Id)
            .ToListAsync();

        if (activePoiIds.Count != normalizedPoiIds.Count)
            return BadRequest(new { message = "Danh sách POI chứa mục không hợp lệ hoặc chưa được duyệt" });

        tour.Name = normalizedName;
        tour.Description = request.Description?.Trim() ?? "";
        tour.CoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl) ? null : request.CoverImageUrl.Trim();
        tour.IsPublished = request.IsPublished;
        tour.UpdatedAt = DateTime.UtcNow;

        var existingTourPois = await _db.TourPois.Where(x => x.TourId == tourId).ToListAsync();
        _db.TourPois.RemoveRange(existingTourPois);
        await _db.SaveChangesAsync();

        _db.TourPois.AddRange(normalizedPoiIds.Select((poiId, index) => new TourPoi
        {
            TourId = tourId,
            PoiId = poiId,
            SortOrder = index
        }));

        await _db.SaveChangesAsync();
        return await GetTourDetailInternalAsync(tourId);
    }

    [HttpDelete("{tourId}")]
    public async Task<IActionResult> DeleteTour(int tourId, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var tour = await _db.Tours.FindAsync(tourId);
        if (tour == null)
            return NotFound(new { message = "Tour không tồn tại" });

        await using var transaction = await _db.Database.BeginTransactionAsync();
        await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM tour_pois WHERE tour_id = {tourId}");
        await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM tours WHERE id = {tourId}");
        await transaction.CommitAsync();

        return Ok(new { message = "Đã xóa tour" });
    }

    private async Task<IActionResult> GetTourDetailInternalAsync(int tourId)
    {
        var tour = await _db.Tours.FindAsync(tourId);
        if (tour == null)
            return NotFound(new { message = "Tour không tồn tại" });

        var tourPois = await _db.TourPois
            .Where(x => x.TourId == tourId)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();
        var poiIds = tourPois.Select(x => x.PoiId).Distinct().ToList();
        var pois = poiIds.Count == 0
            ? new List<Poi>()
            : await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var poiImages = poiIds.Count == 0
            ? new List<PoiImage>()
            : await _db.PoiImages
                .Where(x => poiIds.Contains(x.PoiId))
                .OrderBy(x => x.SortOrder)
                .ToListAsync();

        return Ok(BuildAdminTourResponse(tour, tourPois, pois, poiImages));
    }

    private static List<string> NormalizePoiIds(IEnumerable<string>? poiIds)
    {
        return (poiIds ?? Array.Empty<string>())
            .Select(x => x?.Trim() ?? "")
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();
    }

    private static object BuildAdminTourResponse(Tour tour, List<TourPoi> tourPois, List<Poi> pois, List<PoiImage> poiImages)
    {
        var items = tourPois
            .Where(x => x.TourId == tour.Id)
            .OrderBy(x => x.SortOrder)
            .Select(link =>
            {
                var poi = pois.FirstOrDefault(x => x.Id == link.PoiId);
                return new
                {
                    poi_id = link.PoiId,
                    sort_order = link.SortOrder,
                    poi_name = poi?.Name ?? link.PoiId,
                    poi_status = poi?.Status ?? "unknown",
                    image = poiImages.FirstOrDefault(x => x.PoiId == link.PoiId)?.ImageUrl
                };
            })
            .ToList();

        return new
        {
            tour.Id,
            tour.Name,
            tour.Description,
            cover_image_url = tour.CoverImageUrl,
            is_published = tour.IsPublished,
            created_at = tour.CreatedAt,
            updated_at = tour.UpdatedAt,
            poi_count = items.Count,
            poi_ids = items.Select(x => x.poi_id).ToList(),
            pois = items
        };
    }
}

public class SaveTourRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public bool IsPublished { get; set; }
    public List<string> PoiIds { get; set; } = new();
}
