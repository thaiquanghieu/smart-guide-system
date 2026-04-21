using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using System.Text.Json;

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

        var device = await _db.Devices.FirstOrDefaultAsync(x => x.DeviceUuid == request.DeviceUuid);
        if (device == null)
        {
            device = new Device
            {
                DeviceUuid = request.DeviceUuid,
                RegisteredAt = now
            };

            _db.Devices.Add(device);
        }

        device.Name = request.Name?.Trim();
        device.Platform = request.Platform?.Trim()?.ToLowerInvariant();
        device.Model = request.Model?.Trim();
        device.AppVersion = request.AppVersion?.Trim();
        device.PushToken = request.PushToken?.Trim();
        device.QrCode = string.IsNullOrWhiteSpace(request.QrCode) ? device.QrCode : request.QrCode.Trim();
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
}

public class DeviceRegisterRequest
{
    public Guid DeviceUuid { get; set; }
    public string? Name { get; set; }
    public string? Platform { get; set; }
    public string? Model { get; set; }
    public string? AppVersion { get; set; }
    public string? PushToken { get; set; }
    public string? QrCode { get; set; }
    public JsonElement Metadata { get; set; }
}
