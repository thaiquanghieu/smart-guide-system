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

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetProfile(int userId)
    {
        var user = await _db.Users
            .Where(p => p.Id == userId)
            .Select(p => new
            {
                UserName = p.UserName,
                Email = p.Email,
                AvatarUrl = p.AvatarUrl,
                FavoriteCount = p.FavoriteCount,
                ListenedPoiCount = p.ListenedPoiCount
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound();

        return Ok(user);
    }
}
