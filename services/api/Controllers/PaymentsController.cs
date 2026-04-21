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

    private async Task<Device?> GetActiveDeviceAsync(int deviceId)
    {
        if (deviceId <= 0)
            return null;

        return await _db.Devices.FirstOrDefaultAsync(x => x.Id == deviceId && x.IsActive);
    }

    // =========================
    // TẠO QR
    // =========================
    [HttpPost("create")]
    public async Task<IActionResult> CreatePayment(int deviceId, int planId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return BadRequest(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var now = DateTime.UtcNow;

        var code = $"SGPAY_{Guid.NewGuid().ToString().Substring(0,8)}";

        var payment = new Payment
        {
            DeviceId = deviceId,
            PlanId = planId,
            Code = code,
            IsUsed = false,
            CreatedAt = DateTime.SpecifyKind(now, DateTimeKind.Utc)
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        var plan = await _db.Plans.FindAsync(planId);
        if (plan == null)
            return BadRequest(new { message = "Plan không tồn tại" });

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
    public async Task<IActionResult> Scan(string code, int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return BadRequest(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var now = DateTime.UtcNow;

        var payment = await _db.Payments
            .FirstOrDefaultAsync(x => x.Code == code);

        if (payment == null)
            return BadRequest(new { message = "QR không tồn tại" });

        if (payment.IsUsed)
            return BadRequest(new { message = "QR đã dùng" });

        if (payment.DeviceId != deviceId)
            return BadRequest(new { message = "QR không thuộc thiết bị này" });

        var plan = await _db.Plans.FindAsync(payment.PlanId);

        if (plan == null)
            return BadRequest(new { message = "Plan không tồn tại" });

        var sub = await _db.Subscriptions
            .FirstOrDefaultAsync(x => x.DeviceId == deviceId);

        if (sub == null)
        {
            sub = new Subscription
            {
                DeviceId = deviceId,
                ExpireAt = DateTime.SpecifyKind(now.AddDays(plan.Days), DateTimeKind.Utc)
            };
            _db.Subscriptions.Add(sub);
        }
        else
        {
            if (sub.ExpireAt > now)
                sub.ExpireAt = DateTime.SpecifyKind(sub.ExpireAt.AddDays(plan.Days), DateTimeKind.Utc);
            else
                sub.ExpireAt = DateTime.SpecifyKind(now.AddDays(plan.Days), DateTimeKind.Utc);
        }

        payment.IsUsed = true;
        payment.UsedAt = now;

        _db.QrLogs.Add(new QrLog
        {
            DeviceId = deviceId,
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
    public async Task<IActionResult> Check(int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return Ok(new { isActive = false, reason = "device_inactive" });

        var sub = await _db.Subscriptions
            .FirstOrDefaultAsync(x => x.DeviceId == deviceId);

        if (sub == null)
            return Ok(new { isActive = false });

        var now = DateTime.UtcNow;

        if (sub.ExpireAt > now)
            return Ok(new { isActive = true, expire = sub.ExpireAt });

        return Ok(new { isActive = false });
    }
}
