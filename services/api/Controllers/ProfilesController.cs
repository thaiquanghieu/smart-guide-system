using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfilesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{deviceId}")]
    public async Task<IActionResult> GetProfile(int deviceId)
    {
        var device = await _db.Devices.FindAsync(deviceId);
        if (device == null)
            return NotFound();

        var favoriteCount = await _db.Favorites.CountAsync(x => x.DeviceId == deviceId);
        var listenedPoiCount = await _db.ListenLogs.CountAsync(x => x.DeviceId == deviceId);

        return Ok(new
        {
            device.Id,
            DeviceName = string.IsNullOrWhiteSpace(device.Name) ? "Thiết bị Smart Guide" : device.Name,
            DeviceUuid = device.DeviceUuid,
            Platform = device.Platform,
            Model = device.Model,
            AppVersion = device.AppVersion,
            FavoriteCount = favoriteCount,
            ListenedPoiCount = listenedPoiCount
        });
    }
}
