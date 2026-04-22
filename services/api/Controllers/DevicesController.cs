using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using System.Text.Json;
using System.Linq;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly AppDbContext _db;

    public DevicesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] DeviceRegisterRequest request)
    {
        if (request.DeviceUuid == Guid.Empty)
            return BadRequest(new { message = "Thiếu deviceUuid" });

        var now = DateTime.UtcNow;
        var normalizedPlatform = request.Platform?.Trim()?.ToLowerInvariant();
        var normalizedName = request.Name?.Trim();
        var normalizedModel = request.Model?.Trim();
        var fingerprint = request.Fingerprint?.Trim();

        var device = await _db.Devices.FirstOrDefaultAsync(x => x.DeviceUuid == request.DeviceUuid);

        if (device == null && !string.IsNullOrWhiteSpace(fingerprint))
        {
            var samePlatformDevices = await _db.Devices
                .Where(x => x.IsActive && x.Platform == normalizedPlatform)
                .OrderByDescending(x => x.LastSeen ?? x.RegisteredAt)
                .ToListAsync();

            device = samePlatformDevices.FirstOrDefault(x => ExtractFingerprint(x.Metadata) == fingerprint);
        }

        if (device == null)
        {
            var subscribedDeviceIds = await _db.Subscriptions
                .Where(x => x.ExpireAt > now)
                .Select(x => x.DeviceId)
                .ToListAsync();

            device = await _db.Devices
                .Where(x =>
                    x.IsActive &&
                    subscribedDeviceIds.Contains(x.Id) &&
                    x.Platform == normalizedPlatform &&
                    x.Name == normalizedName)
                .OrderByDescending(x => x.LastSeen ?? x.RegisteredAt)
                .FirstOrDefaultAsync();
        }

        if (device == null)
        {
            device = new Device
            {
                DeviceUuid = request.DeviceUuid,
                RegisteredAt = now
            };

            _db.Devices.Add(device);
        }
        else
        {
            device.DeviceUuid = request.DeviceUuid;
        }

        device.Name = normalizedName;
        device.Platform = normalizedPlatform;
        device.Model = normalizedModel;
        device.AppVersion = request.AppVersion?.Trim();
        device.PushToken = request.PushToken?.Trim();
        device.QrCode = string.IsNullOrWhiteSpace(request.QrCode) ? device.QrCode : request.QrCode.Trim();
        device.IsActive = true;
        device.Metadata = request.Metadata.ValueKind is JsonValueKind.Object or JsonValueKind.Array
            ? request.Metadata.GetRawText()
            : "{}";
        device.LastSeen = now;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            deviceId = device.Id,
            deviceUuid = device.DeviceUuid,
            isActive = device.IsActive
        });
    }

    private static string? ExtractFingerprint(string? metadata)
    {
        if (string.IsNullOrWhiteSpace(metadata))
            return null;

        try
        {
            using var document = JsonDocument.Parse(metadata);
            if (document.RootElement.TryGetProperty("fingerprint", out var fingerprint))
                return fingerprint.GetString();
        }
        catch
        {
        }

        return null;
    }

    [HttpDelete("{deviceId}")]
    public async Task<IActionResult> Delete(int deviceId)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(x => x.Id == deviceId);
        if (device == null)
            return NotFound(new { message = "Không tìm thấy thiết bị" });

        device.IsActive = false;
        device.LastSeen = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã xóa thiết bị" });
    }
}

public class DeviceRegisterRequest
{
    public Guid DeviceUuid { get; set; }
    public string? Name { get; set; }
    public string? Platform { get; set; }
    public string? Model { get; set; }
    public string? AppVersion { get; set; }
    public string? Fingerprint { get; set; }
    public string? PushToken { get; set; }
    public string? QrCode { get; set; }
    public JsonElement Metadata { get; set; }
}
