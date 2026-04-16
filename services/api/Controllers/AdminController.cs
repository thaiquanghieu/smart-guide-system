using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    // =========================
    // USER MANAGEMENT
    // =========================

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int adminId, [FromQuery] string? role = null)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền truy cập");

        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(x => x.Role == role);

        var users = await query.ToListAsync();

        return Ok(users.Select(u => new
        {
            u.Id,
            u.UserName,
            u.Email,
            u.Role,
            u.IsActive,
            u.CreatedAt
        }));
    }

    [HttpPut("users/{userId}/toggle-active")]
    public async Task<IActionResult> ToggleUserActive(int userId, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        user.IsActive = !user.IsActive;
        _db.Users.Update(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"User được {(user.IsActive ? "kích hoạt" : "vô hiệu hóa")}" });
    }

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(int userId, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = "User được xóa thành công" });
    }

    // =========================
    // POI APPROVAL MANAGEMENT
    // =========================

    [HttpGet("pois")]
    public async Task<IActionResult> GetAllPois([FromQuery] int adminId, [FromQuery] string? status = null)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var query = _db.Pois.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var pois = await query.ToListAsync();
        var poiImages = await _db.PoiImages.OrderBy(x => x.SortOrder).ToListAsync();
        var audioGuides = await _db.AudioGuides.ToListAsync();

        var result = pois.Select(p => new
        {
            p.Id,
            p.Name,
            p.Description,
            p.Address,
            p.Status,
            p.Latitude,
            p.Longitude,
            p.Radius,
            p.Priority,
            p.OwnerId,
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

    [HttpPut("pois/{id}/approve")]
    public async Task<IActionResult> ApprovePoi(string id, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var poi = await _db.Pois.FindAsync(id);
        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        poi.Status = "approved";
        poi.UpdatedAt = DateTime.UtcNow;
        _db.Pois.Update(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI được phê duyệt thành công" });
    }

    [HttpPut("pois/{id}/reject")]
    public async Task<IActionResult> RejectPoi(string id, [FromBody] RejectPoiRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var poi = await _db.Pois.FindAsync(id);
        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        poi.Status = "rejected";
        poi.UpdatedAt = DateTime.UtcNow;
        _db.Pois.Update(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI bị từ chối" });
    }

    [HttpDelete("pois/{id}")]
    public async Task<IActionResult> DeletePoi(string id, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var poi = await _db.Pois.FindAsync(id);
        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        _db.Pois.Remove(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI được xóa thành công" });
    }

    // =========================
    // ANALYTICS (GLOBAL)
    // =========================

    [HttpGet("analytics/dashboard")]
    public async Task<IActionResult> GetAnalytics([FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var totalUsers = await _db.Users.CountAsync();
        var totalOwners = await _db.Users.Where(x => x.Role == "owner").CountAsync();
        var totalPois = await _db.Pois.CountAsync();
        var approvedPois = await _db.Pois.Where(x => x.Status == "approved").CountAsync();
        var pendingPois = await _db.Pois.Where(x => x.Status == "pending").CountAsync();
        var rejectedPois = await _db.Pois.Where(x => x.Status == "rejected").CountAsync();

        var totalListens = await _db.ListenLogs.CountAsync();
        var avgDuration = await _db.ListenLogs.AverageAsync(x => (double?)x.DurationSeconds) ?? 0;

        var topPois = await _db.Pois
            .OrderByDescending(x => x.ListenedCount)
            .Take(5)
            .Select(x => new { x.Id, x.Name, listened_count = x.ListenedCount })
            .ToListAsync();

        var topOwners = await _db.Pois
            .GroupBy(x => x.OwnerId)
            .Select(g => new
            {
                owner_id = g.Key,
                poi_count = g.Count(),
                total_listens = g.Sum(x => x.ListenedCount)
            })
            .OrderByDescending(x => x.total_listens)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            users = new { total = totalUsers, owners = totalOwners },
            pois = new { total = totalPois, approved = approvedPois, pending = pendingPois, rejected = rejectedPois },
            listens = new { total = totalListens, avg_duration_seconds = (int)avgDuration },
            top_pois = topPois,
            top_owners = topOwners
        });
    }
}

public class RejectPoiRequest
{
    public string? Reason { get; set; }
}
