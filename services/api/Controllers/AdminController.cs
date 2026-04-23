using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using System.Text.Json;

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
    // ACCOUNT MANAGEMENT
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

    [HttpPut("users/{userId}/status")]
    public async Task<IActionResult> UpdateUserStatus(int userId, [FromBody] UpdateUserStatusRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User không tồn tại" });

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
        {
            return StatusCode(500, new { message = "Cập nhật trạng thái tài khoản thất bại. Kiểm tra migration/schema users.", detail = exception.InnerException?.Message ?? exception.Message });
        }

        return Ok(new { message = "Đã cập nhật trạng thái tài khoản" });
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
        var ownerIds = pois
            .Where(p => p.OwnerId.HasValue)
            .Select(p => p.OwnerId!.Value)
            .Distinct()
            .ToList();
        var owners = await _db.Users.Where(x => ownerIds.Contains(x.Id)).ToListAsync();

        var result = pois.Select(p => new
        {
            p.Id,
            p.Name,
            p.Category,
            categories = DeserializeCategories(p.CategoriesJson, p.Category),
            p.ShortDescription,
            p.Description,
            p.Address,
            p.OpenTime,
            p.CloseTime,
            p.PriceText,
            p.Phone,
            p.WebsiteUrl,
            p.Status,
            p.RejectedReason,
            p.Latitude,
            p.Longitude,
            p.Radius,
            p.Priority,
            p.OwnerId,
            owner_name = p.OwnerId.HasValue
                ? owners.FirstOrDefault(x => x.Id == p.OwnerId.Value)?.UserName ?? $"Seller #{p.OwnerId.Value}"
                : "Chưa gán seller",
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
                    a.VoiceName,
                    a.ScriptText,
                    a.AudioUrl,
                    a.ApprovalStatus,
                    a.RejectedReason
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
        poi.ApprovalNote = "Admin approved";
        poi.RejectedReason = null;
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
        poi.RejectedReason = request.Reason;
        poi.UpdatedAt = DateTime.UtcNow;
        _db.Pois.Update(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI bị từ chối" });
    }

    [HttpPut("audio/{audioId}/approve")]
    public async Task<IActionResult> ApproveAudio(string audioId, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var audio = await _db.AudioGuides.FindAsync(audioId);
        if (audio == null)
            return NotFound(new { message = "Audio không tồn tại" });

        audio.ApprovalStatus = "approved";
        audio.RejectedReason = null;
        audio.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Audio đã được duyệt" });
    }

    [HttpPut("audio/{audioId}/reject")]
    public async Task<IActionResult> RejectAudio(string audioId, [FromBody] RejectPoiRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var audio = await _db.AudioGuides.FindAsync(audioId);
        if (audio == null)
            return NotFound(new { message = "Audio không tồn tại" });

        audio.ApprovalStatus = "rejected";
        audio.RejectedReason = request.Reason;
        audio.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Audio đã bị từ chối" });
    }

    [HttpGet("devices")]
    public async Task<IActionResult> GetDevices([FromQuery] int adminId, [FromQuery] string? status = null)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var now = DateTime.UtcNow;
        var query = _db.Devices.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(x => x.Status == status);

        var devices = await query
            .OrderByDescending(x => x.LastSeen ?? x.RegisteredAt)
            .ToListAsync();

        var deviceIds = devices.Select(x => x.Id).ToList();
        var subscriptions = await _db.Subscriptions
            .Where(x => deviceIds.Contains(x.DeviceId))
            .ToListAsync();
        var listenCounts = await _db.ListenLogs
            .Where(x => deviceIds.Contains(x.DeviceId))
            .GroupBy(x => x.DeviceId)
            .Select(g => new { device_id = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(devices.Select(d =>
        {
            var lastSeen = d.LastSeen;
            var online = d.Status == "active" && lastSeen.HasValue && (now - lastSeen.Value).TotalSeconds <= 5;
            var sub = subscriptions.FirstOrDefault(x => x.DeviceId == d.Id);
            return new
            {
                d.Id,
                device_uuid = d.DeviceUuid,
                d.Name,
                d.Platform,
                d.Model,
                app_version = d.AppVersion,
                d.Status,
                is_active = d.IsActive,
                is_online = online,
                last_seen = d.LastSeen,
                registered_at = d.RegisteredAt,
                deleted_at = d.DeletedAt,
                banned_at = d.BannedAt,
                ban_reason = d.BanReason,
                listen_count = listenCounts.FirstOrDefault(x => x.device_id == d.Id)?.count ?? 0,
                subscription_expire_at = sub?.ExpireAt,
                has_active_subscription = sub?.ExpireAt > now
            };
        }));
    }

    [HttpPut("devices/{deviceId}/status")]
    public async Task<IActionResult> UpdateDeviceStatus(int deviceId, [FromBody] UpdateDeviceStatusRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        if (request.Status is not ("active" or "inactive" or "banned" or "user_deleted"))
            return BadRequest(new { message = "Trạng thái thiết bị không hợp lệ" });

        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null)
            return NotFound(new { message = "Thiết bị không tồn tại" });

        var now = DateTime.UtcNow;
        device.Status = request.Status;
        device.IsActive = request.Status == "active";
        device.BanReason = request.Status == "banned" ? request.Reason : null;
        device.BannedAt = request.Status == "banned" ? now : null;
        device.DeletedAt = request.Status == "user_deleted" ? now : null;
        device.LastSeen = now;

        if (request.Status is "banned" or "user_deleted")
        {
            var activeSubscriptions = await _db.Subscriptions
                .Where(x => x.DeviceId == deviceId && x.ExpireAt > now)
                .ToListAsync();

            foreach (var subscription in activeSubscriptions)
                subscription.ExpireAt = now;
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã cập nhật thiết bị" });
    }

    [HttpDelete("devices/{deviceId}")]
    public async Task<IActionResult> DeleteDevice(int deviceId, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null)
            return NotFound(new { message = "Thiết bị không tồn tại" });

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM device_entry_grants WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM qr_logs WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM payments WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM subscriptions WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM ratings WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM favorites WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM listen_logs WHERE device_id = {deviceId}");
            await _db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM devices WHERE id = {deviceId}");
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new
            {
                message = "Xóa thiết bị thất bại. Kiểm tra ràng buộc dữ liệu liên quan.",
                detail = exception.InnerException?.Message ?? exception.Message
            });
        }
        catch (Exception exception)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new
            {
                message = "Xóa thiết bị thất bại. Kiểm tra ràng buộc dữ liệu liên quan.",
                detail = exception.InnerException?.Message ?? exception.Message
            });
        }

        return Ok(new { message = "Đã xóa hẳn thiết bị khỏi DB" });
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
        var totalAdmins = await _db.Users.Where(x => x.Role == "admin").CountAsync();
        var totalOwners = await _db.Users.Where(x => x.Role == "owner").CountAsync();
        var onlineCutoff = DateTime.UtcNow.AddSeconds(-5);
        var totalDevices = await _db.Devices.CountAsync();
        var onlineDevices = await _db.Devices.CountAsync(x => x.Status == "active" && x.LastSeen != null && x.LastSeen > onlineCutoff);
        var bannedDevices = await _db.Devices.CountAsync(x => x.Status == "banned");
        var totalPois = await _db.Pois.CountAsync();
        var approvedPois = await _db.Pois.Where(x => x.Status == "approved").CountAsync();
        var pendingPois = await _db.Pois.Where(x => x.Status == "pending").CountAsync();
        var rejectedPois = await _db.Pois.Where(x => x.Status == "rejected").CountAsync();

        var totalListens = await _db.ListenLogs.CountAsync();
        var avgDuration = await _db.ListenLogs.AverageAsync(x => (double?)x.DurationSeconds) ?? 0;

        var poiListenCounts = await _db.ListenLogs
            .GroupBy(x => x.PoiId)
            .Select(g => new { poi_id = g.Key, count = g.Count() })
            .ToListAsync();

        var allPoisForStats = await _db.Pois
            .ToListAsync();

        var topPoiResult = allPoisForStats
            .Select(x => new
            {
                x.Id,
                x.Name,
                listened_count = poiListenCounts.FirstOrDefault(l => l.poi_id == x.Id)?.count ?? 0
            })
            .OrderByDescending(x => x.listened_count)
            .Take(5)
            .ToList();

        var topOwners = allPoisForStats
            .GroupBy(x => x.OwnerId)
            .Select(g => new
            {
                owner_id = g.Key,
                poi_count = g.Count(),
                total_listens = g.Sum(x => poiListenCounts.FirstOrDefault(l => l.poi_id == x.Id)?.count ?? 0)
            })
            .OrderByDescending(x => x.total_listens)
            .Take(5)
            .ToList();

        return Ok(new
        {
            users = new { total = totalUsers, owners = totalOwners, admins = totalAdmins },
            devices = new { total = totalDevices, online = onlineDevices, banned = bannedDevices },
            pois = new { total = totalPois, approved = approvedPois, pending = pendingPois, rejected = rejectedPois },
            listens = new { total = totalListens, avg_duration_seconds = (int)avgDuration },
            top_pois = topPoiResult,
            top_owners = topOwners
        });
    }

    private static List<string> DeserializeCategories(string? categoriesJson, string? fallback)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(categoriesJson))
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(categoriesJson);
                if (parsed != null && parsed.Count > 0)
                    return parsed;
            }
        }
        catch
        {
        }

        return string.IsNullOrWhiteSpace(fallback) ? new List<string>() : new List<string> { fallback };
    }
}

public class RejectPoiRequest
{
    public string? Reason { get; set; }
}

public class UpdateUserStatusRequest
{
    public bool IsActive { get; set; }
}

public class UpdateDeviceStatusRequest
{
    public string Status { get; set; } = "active";
    public string? Reason { get; set; }
}
