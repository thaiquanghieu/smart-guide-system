using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccessController : ControllerBase
{
    private static readonly TimeSpan EntryGrantCooldown = TimeSpan.FromHours(24);
    private static readonly TimeSpan EntryGrantExpiry = TimeSpan.FromHours(24);

    private readonly AppDbContext _db;

    public AccessController(AppDbContext db)
    {
        _db = db;
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

        if (hasActiveSubscription)
        {
            return Ok(new
            {
                hasActiveSubscription = true,
                granted = false,
                freePlaysRemaining = 0,
                poiId = request.PoiId
            });
        }

        var normalizedCode = request.EntryCode.Trim();

        var latestGrant = await _db.DeviceEntryGrants
            .Where(x => x.DeviceId == request.DeviceId && x.EntryCode == normalizedCode)
            .OrderByDescending(x => x.GrantedAt)
            .FirstOrDefaultAsync();

        DeviceEntryGrant grant;

        if (latestGrant != null && now - latestGrant.GrantedAt < EntryGrantCooldown)
        {
            grant = latestGrant;
        }
        else
        {
            grant = new DeviceEntryGrant
            {
                DeviceId = request.DeviceId,
                EntryCode = normalizedCode,
                PoiId = string.IsNullOrWhiteSpace(request.PoiId) ? null : request.PoiId.Trim(),
                FreePlaysTotal = 1,
                FreePlaysUsed = 0,
                GrantedAt = now,
                ExpiresAt = now.Add(EntryGrantExpiry)
            };

            _db.DeviceEntryGrants.Add(grant);
            await _db.SaveChangesAsync();
        }

        var remaining = Math.Max(0, grant.FreePlaysTotal - grant.FreePlaysUsed);

        return Ok(new
        {
            hasActiveSubscription = false,
            granted = remaining > 0,
            freePlaysRemaining = remaining,
            poiId = grant.PoiId ?? request.PoiId
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
