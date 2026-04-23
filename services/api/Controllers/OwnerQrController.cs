using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/owner/qr")]
public class OwnerQrController : ControllerBase
{
    private readonly AppDbContext _db;

    public OwnerQrController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<User?> GetOwnerAsync(int ownerId)
    {
        if (ownerId <= 0) return null;
        return await _db.Users.FirstOrDefaultAsync(x => x.Id == ownerId && x.Role == "owner" && x.IsActive);
    }

    private static string GenerateEntryCode()
    {
        return $"QR{Guid.NewGuid():N}".Substring(0, 10).ToUpperInvariant();
    }

    [HttpGet]
    public async Task<IActionResult> GetQrEntries([FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        var entries = await _db.QrEntries
            .Where(x => x.OwnerId == ownerId)
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync();

        var poiIds = entries.Select(x => x.PoiId).Distinct().ToList();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var logs = await _db.QrLogs.Where(x => x.QrEntryId != null && entries.Select(e => e.Id).Contains(x.QrEntryId.Value)).ToListAsync();

        var result = entries.Select(entry => new
        {
            entry.Id,
            entry.Name,
            entry.EntryCode,
            entry.PoiId,
            poi_name = pois.FirstOrDefault(x => x.Id == entry.PoiId)?.Name ?? "",
            entry.TotalScans,
            entry.UsedScans,
            remaining_scans = Math.Max(0, entry.TotalScans - entry.UsedScans),
            Status = entry.UsedScans >= entry.TotalScans ? "expired" : entry.Status,
            entry.ExpiresAt,
            entry.CreatedAt,
            entry.UpdatedAt,
            last_scanned_at = logs.Where(x => x.QrEntryId == entry.Id).OrderByDescending(x => x.ScannedAt).Select(x => (DateTime?)x.ScannedAt).FirstOrDefault(),
            total_logs = logs.Count(x => x.QrEntryId == entry.Id)
        });

        return Ok(result);
    }

    [HttpGet("logs")]
    public async Task<IActionResult> GetOwnerQrLogs([FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        var entries = await _db.QrEntries
            .Where(x => x.OwnerId == ownerId)
            .ToListAsync();

        var entryIds = entries.Select(x => x.Id).ToList();
        var poiIds = entries.Select(x => x.PoiId).Distinct().ToList();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();

        var logs = await _db.QrLogs
            .Where(x => x.QrEntryId != null && entryIds.Contains(x.QrEntryId.Value))
            .OrderByDescending(x => x.ScannedAt)
            .ToListAsync();

        return Ok(logs.Select(log =>
        {
            var entry = entries.FirstOrDefault(x => x.Id == log.QrEntryId);
            var poi = pois.FirstOrDefault(x => x.Id == log.PoiId);

            return new
            {
                log.Id,
                log.QrEntryId,
                entry_code = entry?.EntryCode ?? log.Code,
                qr_name = entry?.Name ?? log.Code,
                poi_id = log.PoiId,
                poi_name = poi?.Name ?? "",
                log.Code,
                log.ScannedAt,
                log.ScanStatus,
                log.GrantedFreeListen,
                device_label = $"Thiết bị #{log.DeviceId:D4}"
            };
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateQrEntry([FromBody] CreateQrEntryRequest request, [FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        if (string.IsNullOrWhiteSpace(request.PoiId))
            return BadRequest(new { message = "Thiếu poiId" });

        if (request.TotalScans <= 0)
            return BadRequest(new { message = "Số lượt quét phải lớn hơn 0" });

        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == request.PoiId && x.OwnerId == ownerId);
        if (poi == null)
            return BadRequest(new { message = "POI không hợp lệ" });

        var now = DateTime.UtcNow;
        var entry = new QrEntry
        {
            OwnerId = ownerId,
            PoiId = request.PoiId.Trim(),
            Name = string.IsNullOrWhiteSpace(request.Name) ? $"QR - {poi.Name}" : request.Name.Trim(),
            EntryCode = GenerateEntryCode(),
            TotalScans = request.TotalScans,
            UsedScans = 0,
            Status = "active",
            ExpiresAt = request.ExpiresAt,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.QrEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            entry.Id,
            entry.EntryCode,
            qr_url = $"{request.BaseUrl?.TrimEnd('/') ?? ""}/qr/{entry.EntryCode}",
            message = "Tạo QR thành công"
        });
    }

    [HttpPut("{id}/topup")]
    public async Task<IActionResult> TopUpQrEntry(int id, [FromBody] TopUpQrEntryRequest request, [FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        if (request.AdditionalScans <= 0)
            return BadRequest(new { message = "Số lượt cộng thêm phải lớn hơn 0" });

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == ownerId);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        entry.TotalScans += request.AdditionalScans;
        if (request.ExpiresAt.HasValue)
            entry.ExpiresAt = request.ExpiresAt;
        if (entry.Status == "expired" || entry.Status == "inactive")
            entry.Status = "active";
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Đã gia hạn lượt quét" });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateQrEntryStatus(int id, [FromBody] UpdateQrEntryStatusRequest request, [FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        if (request.Status is not ("active" or "inactive"))
            return BadRequest(new { message = "Trạng thái không hợp lệ" });

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == ownerId);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        entry.Status = request.Status;
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã cập nhật trạng thái QR" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQrEntry(int id, [FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == ownerId);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        entry.Status = "inactive";
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã ẩn QR" });
    }

    [HttpGet("{id}/logs")]
    public async Task<IActionResult> GetQrEntryLogs(int id, [FromQuery] int ownerId)
    {
        var owner = await GetOwnerAsync(ownerId);
        if (owner == null)
            return Forbid("Chỉ owner mới có quyền truy cập");

        var entry = await _db.QrEntries.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == ownerId);
        if (entry == null)
            return NotFound(new { message = "QR không tồn tại" });

        var logs = await _db.QrLogs
            .Where(x => x.QrEntryId == id)
            .OrderByDescending(x => x.ScannedAt)
            .ToListAsync();

        return Ok(logs.Select(log => new
        {
            log.Id,
            log.Code,
            log.ScannedAt,
            log.ScanStatus,
            log.GrantedFreeListen,
            device_label = $"Thiết bị #{log.DeviceId:D4}"
        }));
    }
}

public class CreateQrEntryRequest
{
    public string PoiId { get; set; } = "";
    public string? Name { get; set; }
    public int TotalScans { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? BaseUrl { get; set; }
}

public class TopUpQrEntryRequest
{
    public int AdditionalScans { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class UpdateQrEntryStatusRequest
{
    public string Status { get; set; } = "active";
}
