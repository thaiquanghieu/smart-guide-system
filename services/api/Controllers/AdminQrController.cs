using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/admin/qr")]
public class AdminQrController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminQrController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<bool> IsAdminAsync(int adminId)
    {
        return await _db.Users.AnyAsync(x => x.Id == adminId && x.Role == "admin" && x.IsActive);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllQrEntries([FromQuery] int adminId)
    {
        if (!await IsAdminAsync(adminId))
            return Forbid("Chỉ admin mới có quyền truy cập");

        var entries = await _db.QrEntries.OrderByDescending(x => x.UpdatedAt).ToListAsync();
        var ownerIds = entries.Select(x => x.OwnerId).Distinct().ToList();
        var poiIds = entries.Select(x => x.PoiId).Distinct().ToList();

        var owners = await _db.Users.Where(x => ownerIds.Contains(x.Id)).ToListAsync();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var logs = await _db.QrLogs.Where(x => x.QrEntryId != null && entries.Select(e => e.Id).Contains(x.QrEntryId.Value)).ToListAsync();

        return Ok(entries.Select(entry => new
        {
            entry.Id,
            entry.Name,
            entry.EntryCode,
            entry.PoiId,
            poi_name = pois.FirstOrDefault(x => x.Id == entry.PoiId)?.Name ?? "",
            owner_id = entry.OwnerId,
            owner_name = owners.FirstOrDefault(x => x.Id == entry.OwnerId)?.UserName ?? $"Owner #{entry.OwnerId}",
            entry.TotalScans,
            entry.UsedScans,
            remaining_scans = Math.Max(0, entry.TotalScans - entry.UsedScans),
            Status = entry.UsedScans >= entry.TotalScans ? "expired" : entry.Status,
            suspension_reason = entry.SuspensionReason,
            activation_requested_at = entry.ActivationRequestedAt,
            activation_request_note = entry.ActivationRequestNote,
            entry.ExpiresAt,
            entry.CreatedAt,
            entry.UpdatedAt,
            total_logs = logs.Count(x => x.QrEntryId == entry.Id),
            last_scanned_at = logs.Where(x => x.QrEntryId == entry.Id).OrderByDescending(x => x.ScannedAt).Select(x => (DateTime?)x.ScannedAt).FirstOrDefault()
        }));
    }

    [HttpGet("logs")]
    public async Task<IActionResult> GetAllQrLogs([FromQuery] int adminId)
    {
        if (!await IsAdminAsync(adminId))
            return Forbid("Chỉ admin mới có quyền truy cập");

        var entries = await _db.QrEntries.ToListAsync();
        var ownerIds = entries.Select(x => x.OwnerId).Distinct().ToList();
        var poiIds = entries.Select(x => x.PoiId).Distinct().ToList();
        var owners = await _db.Users.Where(x => ownerIds.Contains(x.Id)).ToListAsync();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var logs = await _db.QrLogs.OrderByDescending(x => x.ScannedAt).ToListAsync();

        return Ok(logs.Select(log =>
        {
            var entry = entries.FirstOrDefault(x => x.Id == log.QrEntryId);
            var owner = entry == null ? null : owners.FirstOrDefault(x => x.Id == entry.OwnerId);
            var poi = pois.FirstOrDefault(x => x.Id == log.PoiId);

            return new
            {
                log.Id,
                log.QrEntryId,
                owner_id = owner?.Id,
                owner_name = owner?.UserName ?? "-",
                poi_id = log.PoiId,
                poi_name = poi?.Name ?? "",
                entry_code = entry?.EntryCode ?? log.Code,
                qr_name = entry?.Name ?? log.Code,
                device_label = $"Thiết bị #{log.DeviceId:D4}",
                log.Code,
                log.ScanStatus,
                log.GrantedFreeListen,
                log.ScannedAt
            };
        }));
    }

    [HttpGet("{id}/logs")]
    public async Task<IActionResult> GetQrLogs(int id, [FromQuery] int adminId)
    {
        if (!await IsAdminAsync(adminId))
            return Forbid("Chỉ admin mới có quyền truy cập");

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        var logs = await _db.QrLogs
            .Where(x => x.QrEntryId == id)
            .OrderByDescending(x => x.ScannedAt)
            .ToListAsync();

        return Ok(logs.Select(log => new
        {
            log.Id,
            log.DeviceId,
            log.PoiId,
            log.Code,
            log.ScanStatus,
            log.GrantedFreeListen,
            log.ScannedAt
        }));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateQrStatus(int id, [FromBody] UpdateQrEntryStatusRequest request, [FromQuery] int adminId)
    {
        if (!await IsAdminAsync(adminId))
            return Forbid("Chỉ admin mới có quyền truy cập");

        if (request.Status is not ("active" or "inactive" or "expired" or "admin_suspended"))
            return BadRequest(new { message = "Trạng thái không hợp lệ" });

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        entry.Status = request.Status;
        entry.SuspensionReason = request.Status == "admin_suspended" ? request.Reason : null;
        if (request.Status == "active")
        {
            entry.ActivationRequestedAt = null;
            entry.ActivationRequestNote = null;
        }
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã cập nhật trạng thái QR" });
    }

    [HttpPost("{id}/activation-request/reject")]
    public async Task<IActionResult> RejectActivationRequest(int id, [FromBody] RejectActivationRequest request, [FromQuery] int adminId)
    {
        if (!await IsAdminAsync(adminId))
            return Forbid("Chỉ admin mới có quyền truy cập");

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        entry.Status = "admin_suspended";
        entry.SuspensionReason = string.IsNullOrWhiteSpace(request.Reason)
            ? entry.SuspensionReason ?? "Admin từ chối yêu cầu kích hoạt lại"
            : request.Reason.Trim();
        entry.ActivationRequestedAt = null;
        entry.ActivationRequestNote = null;
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã từ chối yêu cầu kích hoạt lại" });
    }

    [HttpDelete("{id}/hard")]
    public async Task<IActionResult> HardDeleteQr(int id, [FromQuery] int adminId)
    {
        if (!await IsAdminAsync(adminId))
            return Forbid("Chỉ admin mới có quyền truy cập");

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        var logs = await _db.QrLogs.Where(x => x.QrEntryId == id).ToListAsync();
        var grants = await _db.DeviceEntryGrants.Where(x => x.QrEntryId == id).ToListAsync();
        try
        {
            _db.DeviceEntryGrants.RemoveRange(grants);
            _db.QrLogs.RemoveRange(logs);
            _db.QrEntries.Remove(entry);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
        {
            return StatusCode(500, new { message = "Xóa QR thất bại do còn dữ liệu liên quan.", detail = exception.InnerException?.Message ?? exception.Message });
        }

        return Ok(new { message = "Đã xóa hẳn QR" });
    }
}

public class RejectActivationRequest
{
    public string? Reason { get; set; }
}
