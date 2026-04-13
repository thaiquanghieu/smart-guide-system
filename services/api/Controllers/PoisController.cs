using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PoisController : ControllerBase
{
    private readonly AppDbContext _db;

    public PoisController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPois()
    {
        Console.WriteLine("🔥 API HIT");

        var pois = await _db.Pois.ToListAsync();

        Console.WriteLine($"👉 EF COUNT: {pois.Count}");

        return Ok(pois);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound();

        return Ok(poi);
    }
}