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
        var pois = await _db.Pois
            .Select(x => new Poi
            {
                Id = x.Id,
                Name = x.Name,
                Category = x.Category ?? "",
                Description = x.Description ?? "",
                Address = x.Address ?? "",
                PriceText = x.PriceText ?? "",
                Latitude = x.Latitude,
                Longitude = x.Longitude
            })
            .ToListAsync();

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