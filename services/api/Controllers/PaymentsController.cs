using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PaymentsController(AppDbContext db)
    {
        _db = db;
    }

    // =========================
    // TẠO QR
    // =========================
    [HttpPost("create")]
    public async Task<IActionResult> CreatePayment(int userId, int planId)
    {
        var now = DateTime.UtcNow;

        var code = $"SGPAY_{Guid.NewGuid().ToString().Substring(0,8)}";

        var payment = new Payment
        {
            UserId = userId,
            PlanId = planId,
            Code = code,
            IsUsed = false,
            CreatedAt = now
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        var plan = await _db.Plans.FindAsync(planId);

        return Ok(new
        {
            code,
            plan = new
            {
                plan.Id,
                plan.Name,
                plan.Days,
                plan.Price
            }
        });
    }

    // =========================
    // SCAN QR
    // =========================
    [HttpPost("scan")]
    public async Task<IActionResult> Scan(string code, int userId)
    {
        var now = DateTime.UtcNow;

        var payment = await _db.Payments
            .FirstOrDefaultAsync(x => x.Code == code);

        if (payment == null)
            return BadRequest("QR không tồn tại");

        if (payment.IsUsed)
            return BadRequest("QR đã dùng");

        if (payment.UserId != userId)
            return BadRequest("QR không thuộc user");

        var plan = await _db.Plans.FindAsync(payment.PlanId);

        if (plan == null)
            return BadRequest("Plan không tồn tại");

        var sub = await _db.Subscriptions
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (sub == null)
        {
            sub = new Subscription
            {
                UserId = userId,
                ExpireAt = now.AddDays(plan.Days)
            };
            _db.Subscriptions.Add(sub);
        }
        else
        {
            if (sub.ExpireAt > now)
                sub.ExpireAt = sub.ExpireAt.AddDays(plan.Days);
            else
                sub.ExpireAt = now.AddDays(plan.Days);
        }

        payment.IsUsed = true;
        payment.UsedAt = now;

        _db.QrLogs.Add(new QrLog
        {
            UserId = userId,
            Code = code
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Activated",
            expire = sub.ExpireAt
        });
    }

    [HttpGet("check")]
    public async Task<IActionResult> Check(int userId)
    {
        var sub = await _db.Subscriptions
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (sub == null)
            return Ok(new { isActive = false });

        var now = DateTime.UtcNow;

        if (sub.ExpireAt > now)
            return Ok(new { isActive = true, expire = sub.ExpireAt });

        return Ok(new { isActive = false });
    }
}