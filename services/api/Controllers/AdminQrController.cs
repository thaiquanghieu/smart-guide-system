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
            entry.Status,
            entry.ExpiresAt,
            entry.CreatedAt,
            entry.UpdatedAt,
            total_logs = logs.Count(x => x.QrEntryId == entry.Id),
            last_scanned_at = logs.Where(x => x.QrEntryId == entry.Id).OrderByDescending(x => x.ScannedAt).Select(x => (DateTime?)x.ScannedAt).FirstOrDefault()
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

        if (request.Status is not ("active" or "inactive" or "expired"))
            return BadRequest(new { message = "Trạng thái không hợp lệ" });

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        entry.Status = request.Status;
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã cập nhật trạng thái QR" });
    }
}
