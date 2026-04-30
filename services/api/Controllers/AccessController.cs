using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccessController : ControllerBase
{
    private static readonly TimeSpan EntryGrantExpiry = TimeSpan.FromHours(24);

    private readonly AppDbContext _db;

    public AccessController(AppDbContext db)
    {
        _db = db;
    }

    private static string? ExtractFingerprint(string? metadata)
    {
        if (string.IsNullOrWhiteSpace(metadata))
            return null;

        try
        {
            using var document = System.Text.Json.JsonDocument.Parse(metadata);
            if (document.RootElement.TryGetProperty("fingerprint", out var fingerprint))
                return fingerprint.GetString();
        }
        catch
        {
        }

        return null;
    }

    private async Task<Device?> GetActiveDeviceAsync(int deviceId)
    {
        if (deviceId <= 0)
            return null;

        return await _db.Devices.FirstOrDefaultAsync(x => x.Id == deviceId && x.IsActive);
    }

    private async Task<bool> HasActiveSubscriptionAsync(int deviceId, DateTime now)
    {
        return await _db.Subscriptions.AnyAsync(x => x.DeviceId == deviceId && x.ExpireAt > now);
    }

    private async Task<List<int>> GetSameFingerprintDeviceIdsAsync(Device device)
    {
        var currentFingerprint = ExtractFingerprint(device.Metadata);
        if (string.IsNullOrWhiteSpace(currentFingerprint))
            return new List<int> { device.Id };

        var matchingDeviceIds = await _db.Devices
            .Where(x => x.Platform == device.Platform)
            .ToListAsync();

        return matchingDeviceIds
            .Where(x => ExtractFingerprint(x.Metadata) == currentFingerprint)
            .Select(x => x.Id)
            .ToList();
    }

    [HttpPost("entry")]
    public async Task<IActionResult> RegisterEntry([FromBody] EntryAccessRequest request)
    {
        if (request.DeviceId <= 0)
            return BadRequest(new { message = "Thiếu deviceId" });

        if (string.IsNullOrWhiteSpace(request.EntryCode))
            return BadRequest(new { message = "Thiếu entryCode" });

        var device = await GetActiveDeviceAsync(request.DeviceId);
        if (device == null)
            return BadRequest(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var now = DateTime.UtcNow;
        var hasActiveSubscription = await HasActiveSubscriptionAsync(request.DeviceId, now);
        var normalizedCode = request.EntryCode.Trim();
        var qrEntry = await _db.QrEntries.FirstOrDefaultAsync(x => x.EntryCode == normalizedCode);

        if (qrEntry == null)
            return BadRequest(new { message = "QR không tồn tại" });

        if (qrEntry.Status == "admin_suspended")
            return BadRequest(new { message = "QR đã bị hệ thống tạm ngưng" });

        if (qrEntry.Status is not ("active" or "expired"))
            return BadRequest(new { message = "QR hiện không khả dụng" });

        var poiId = !string.IsNullOrWhiteSpace(request.PoiId) ? request.PoiId.Trim() : qrEntry.PoiId;
        var sameFingerprintDeviceIds = await GetSameFingerprintDeviceIdsAsync(device);

        var qrOutOfFreeQuota = qrEntry.Status == "expired" || qrEntry.UsedScans >= qrEntry.TotalScans;

        if (qrOutOfFreeQuota)
        {
            if (qrEntry.Status != "expired")
            {
                qrEntry.Status = "expired";
                qrEntry.UpdatedAt = now;
            }

            _db.QrLogs.Add(new QrLog
            {
                QrEntryId = qrEntry.Id,
                DeviceId = request.DeviceId,
                PoiId = poiId,
                Code = normalizedCode,
                GrantedFreeListen = false,
                ScanStatus = "quota_exceeded",
                ScannedAt = now
            });
            await _db.SaveChangesAsync();

            return Ok(new
            {
                hasActiveSubscription = false,
                granted = false,
                freePlaysRemaining = 0,
                poiId
            });
        }

        qrEntry.UsedScans += 1;
        qrEntry.UpdatedAt = now;
        if (qrEntry.UsedScans >= qrEntry.TotalScans)
            qrEntry.Status = "expired";

        if (hasActiveSubscription)
        {
            _db.QrLogs.Add(new QrLog
            {
                QrEntryId = qrEntry.Id,
                DeviceId = request.DeviceId,
                PoiId = poiId,
                Code = normalizedCode,
                GrantedFreeListen = false,
                ScanStatus = "subscription_active",
                ScannedAt = now
            });
            await _db.SaveChangesAsync();

            return Ok(new
            {
                hasActiveSubscription = true,
                granted = false,
                freePlaysRemaining = 0,
                poiId
            });
        }

        var hasUsedFreeListenBefore = await _db.DeviceEntryGrants.AnyAsync(x =>
            sameFingerprintDeviceIds.Contains(x.DeviceId));

        if (hasUsedFreeListenBefore)
        {
            _db.QrLogs.Add(new QrLog
            {
                QrEntryId = qrEntry.Id,
                DeviceId = request.DeviceId,
                PoiId = poiId,
                Code = normalizedCode,
                GrantedFreeListen = false,
                ScanStatus = "free_already_used",
                ScannedAt = now
            });
            await _db.SaveChangesAsync();

            return Ok(new
            {
                hasActiveSubscription = false,
                granted = false,
                freePlaysRemaining = 0,
                poiId
            });
        }

        var grant = new DeviceEntryGrant
        {
            QrEntryId = qrEntry.Id,
            DeviceId = request.DeviceId,
            EntryCode = normalizedCode,
            PoiId = poiId,
            FreePlaysTotal = 1,
            FreePlaysUsed = 0,
            GrantedAt = now,
            ExpiresAt = now.Add(EntryGrantExpiry)
        };

        _db.DeviceEntryGrants.Add(grant);
        _db.QrLogs.Add(new QrLog
        {
            QrEntryId = qrEntry.Id,
            DeviceId = request.DeviceId,
            PoiId = poiId,
            Code = normalizedCode,
            GrantedFreeListen = true,
            ScanStatus = "granted",
            ScannedAt = now
        });
        await _db.SaveChangesAsync();

        return Ok(new
        {
            hasActiveSubscription = false,
            granted = true,
            freePlaysRemaining = 1,
            poiId
        });
    }

    [HttpGet("free-listen")]
    public async Task<IActionResult> GetFreeListenStatus(int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return Ok(new { isAllowed = false, freePlaysRemaining = 0 });

        var now = DateTime.UtcNow;
        var hasActiveSubscription = await HasActiveSubscriptionAsync(deviceId, now);
        if (hasActiveSubscription)
        {
            return Ok(new
            {
                isAllowed = true,
                hasActiveSubscription = true,
                freePlaysRemaining = 0
            });
        }

        var grant = await _db.DeviceEntryGrants
            .Where(x => x.DeviceId == deviceId && (x.ExpiresAt == null || x.ExpiresAt > now))
            .OrderByDescending(x => x.GrantedAt)
            .FirstOrDefaultAsync();

        var remaining = grant == null ? 0 : Math.Max(0, grant.FreePlaysTotal - grant.FreePlaysUsed);

        return Ok(new
        {
            isAllowed = remaining > 0,
            hasActiveSubscription = false,
            freePlaysRemaining = remaining,
            poiId = grant?.PoiId,
            entryCode = grant?.EntryCode
        });
    }

    [HttpPost("free-listen/consume")]
    public async Task<IActionResult> ConsumeFreeListen([FromBody] ConsumeFreeListenRequest request)
    {
        var device = await GetActiveDeviceAsync(request.DeviceId);
        if (device == null)
            return BadRequest(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var now = DateTime.UtcNow;
        var hasActiveSubscription = await HasActiveSubscriptionAsync(request.DeviceId, now);
        if (hasActiveSubscription)
        {
            return Ok(new
            {
                ok = true,
                freePlaysRemaining = 0,
                hasActiveSubscription = true
            });
        }

        var grant = await _db.DeviceEntryGrants
            .Where(x => x.DeviceId == request.DeviceId &&
                        (x.ExpiresAt == null || x.ExpiresAt > now) &&
                        x.FreePlaysUsed < x.FreePlaysTotal)
            .OrderByDescending(x => x.GrantedAt)
            .FirstOrDefaultAsync();

        if (grant == null)
            return BadRequest(new { message = "Bạn đã dùng hết lượt nghe miễn phí." });

        grant.FreePlaysUsed += 1;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            ok = true,
            freePlaysRemaining = Math.Max(0, grant.FreePlaysTotal - grant.FreePlaysUsed),
            poiId = request.PoiId ?? grant.PoiId
        });
    }
}

public class EntryAccessRequest
{
    public int DeviceId { get; set; }
    public string EntryCode { get; set; } = "";
    public string? PoiId { get; set; }
}

public class ConsumeFreeListenRequest
{
    public int DeviceId { get; set; }
    public string? PoiId { get; set; }
}
