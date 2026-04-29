using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlansController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlansController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _db.Plans
            .OrderBy(x => x.Price)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Days,
                x.Price
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpGet("admin")]
    public async Task<IActionResult> GetPlansForAdmin([FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var plans = await _db.Plans.OrderBy(x => x.Price).ToListAsync();
        return Ok(plans);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePlan([FromBody] UpsertPlanRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        if (string.IsNullOrWhiteSpace(request.Name) || request.Days <= 0 || request.Price < 0)
            return BadRequest(new { message = "Dữ liệu gói không hợp lệ" });

        var plan = new SmartGuideAPI.Models.Plan
        {
            Name = request.Name.Trim(),
            Days = request.Days,
            Price = request.Price
        };
        _db.Plans.Add(plan);
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] UpsertPlanRequest request, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");

        var plan = await _db.Plans.FindAsync(id);
        if (plan == null)
            return NotFound(new { message = "Không tìm thấy gói" });
        if (string.IsNullOrWhiteSpace(request.Name) || request.Days <= 0 || request.Price < 0)
            return BadRequest(new { message = "Dữ liệu gói không hợp lệ" });

        plan.Name = request.Name.Trim();
        plan.Days = request.Days;
        plan.Price = request.Price;
        await _db.SaveChangesAsync();
        return Ok(plan);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlan(int id, [FromQuery] int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        if (admin == null || admin.Role != "admin")
            return Forbid("Chỉ admin mới có quyền");
        var plan = await _db.Plans.FindAsync(id);
        if (plan == null)
            return NotFound(new { message = "Không tìm thấy gói" });
        _db.Plans.Remove(plan);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Đã xóa gói" });
    }
}

public class UpsertPlanRequest
{
    public string Name { get; set; } = "";
    public int Days { get; set; }
    public int Price { get; set; }
}
