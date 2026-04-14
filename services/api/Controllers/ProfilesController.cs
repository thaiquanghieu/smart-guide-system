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

    // Simple endpoint to return a single profile summary.
    // For now we return the first profile row (this project doesn't have auth yet).
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await _db.Set<Profile>()
            .Select(p => new
            {
                UserName = p.UserName,
                Email = p.Email,
                AvatarUrl = p.AvatarUrl,
                FavoriteCount = p.FavoriteCount,
                ListenedPoiCount = p.ListenedPoiCount
            })
            .FirstOrDefaultAsync();

        if (profile == null)
            return NotFound();

        return Ok(profile);
    }
}
