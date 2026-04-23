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

    private static string PaymentStatusLabel(string status)
    {
        return status switch
        {
            "submitted" => "Chờ hệ thống xác minh",
            "confirmed" => "Đã xác nhận",
            "rejected" => "Đã từ chối",
            "used" => "Thanh toán thành công",
            _ => "Đang chờ"
        };
    }

    private async Task ActivateUserPlanAsync(Payment payment)
    {
        if (!payment.DeviceId.HasValue || !payment.PlanId.HasValue)
            return;

        var plan = await _db.Plans.FindAsync(payment.PlanId.Value);
        if (plan == null)
            return;

        var now = DateTime.UtcNow;
        var sub = await _db.Subscriptions.FirstOrDefaultAsync(x => x.DeviceId == payment.DeviceId.Value);

        if (sub == null)
        {
            sub = new Subscription
            {
                DeviceId = payment.DeviceId.Value,
                ExpireAt = DateTime.SpecifyKind(now.AddDays(plan.Days), DateTimeKind.Utc)
            };
            _db.Subscriptions.Add(sub);
        }
        else
        {
            sub.ExpireAt = sub.ExpireAt > now
                ? DateTime.SpecifyKind(sub.ExpireAt.AddDays(plan.Days), DateTimeKind.Utc)
                : DateTime.SpecifyKind(now.AddDays(plan.Days), DateTimeKind.Utc);
        }

        payment.IsUsed = true;
        payment.UsedAt = now;
        payment.ConfirmedAt = now;
        payment.Status = "used";
        payment.RejectedReason = null;
    }

    private object ToPaymentStatusResponse(Payment payment, string? planName = null, string? poiName = null)
    {
        return new
        {
            payment.Id,
            payment.Code,
            payment.Amount,
            payment.Status,
            status_label = PaymentStatusLabel(payment.Status),
            payment_type = payment.PaymentType,
            payer_type = payment.PayerType,
            payment.DeviceId,
            payment.OwnerId,
            payment.PoiId,
            plan_name = planName,
            poi_name = poiName,
            description = payment.Description ?? planName ?? poiName ?? "Thanh toán",
            created_at = payment.CreatedAt,
            used_at = payment.UsedAt,
            confirmed_at = payment.ConfirmedAt,
            rejected_reason = payment.RejectedReason
        };
    }

    private async Task<IActionResult?> EnsureAdminAsync(int adminId)
    {
        var admin = await _db.Users.FindAsync(adminId);
        return admin == null || admin.Role != "admin" ? Forbid("Chỉ admin mới có quyền") : null;
    }

    private async Task<IActionResult?> EnsureOwnerAsync(int ownerId)
    {
        var owner = await _db.Users.FindAsync(ownerId);
        return owner == null || owner.Role != "owner" ? Forbid("Chỉ seller mới có quyền") : null;
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
        var plan = await _db.Plans.FindAsync(planId);
        if (plan == null)
            return BadRequest(new { message = "Plan không tồn tại" });

        var payment = new Payment
        {
            DeviceId = deviceId,
            PlanId = planId,
            Code = code,
            PayerType = "device",
            PaymentType = "user_plan",
            Amount = plan.Price,
            Status = "pending",
            Description = $"Mua {plan.Name}",
            IsUsed = false,
            CreatedAt = DateTime.SpecifyKind(now, DateTimeKind.Utc)
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

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

        if (!payment.PlanId.HasValue)
            return BadRequest(new { message = "QR chưa gắn gói sử dụng" });

        var plan = await _db.Plans.FindAsync(payment.PlanId.Value);

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
        payment.Status = "used";
        payment.ConfirmedAt = now;

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

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitDevicePayment([FromQuery] string code, [FromQuery] int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return BadRequest(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Code == code && x.DeviceId == deviceId);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy yêu cầu thanh toán" });

        if (payment.Status == "used" || payment.Status == "confirmed")
            return Ok(new { message = "Thanh toán đã được xác nhận trước đó", payment = ToPaymentStatusResponse(payment) });

        payment.Status = "submitted";
        payment.RejectedReason = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã gửi yêu cầu xác minh thanh toán", payment = ToPaymentStatusResponse(payment) });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetDevicePaymentStatus([FromQuery] string code, [FromQuery] int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return NotFound(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Code == code && x.DeviceId == deviceId);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy thanh toán" });

        var plan = payment.PlanId.HasValue ? await _db.Plans.FindAsync(payment.PlanId.Value) : null;
        return Ok(ToPaymentStatusResponse(payment, plan?.Name));
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

    [HttpGet("history")]
    public async Task<IActionResult> GetDevicePaymentHistory([FromQuery] int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return Ok(Array.Empty<object>());

        var payments = await _db.Payments
            .Where(x => x.DeviceId == deviceId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        var planIds = payments.Where(x => x.PlanId.HasValue).Select(x => x.PlanId!.Value).Distinct().ToList();
        var plans = await _db.Plans.Where(x => planIds.Contains(x.Id)).ToListAsync();

        return Ok(payments.Select(payment =>
        {
            var plan = payment.PlanId.HasValue ? plans.FirstOrDefault(x => x.Id == payment.PlanId.Value) : null;
            return new
            {
                payment.Id,
                payment.Code,
                payment.Amount,
                payment.Status,
                status_label = PaymentStatusLabel(payment.Status),
                payment_type = payment.PaymentType,
                description = payment.Description ?? plan?.Name ?? "Thanh toán",
                plan_name = plan?.Name,
                plan_days = plan?.Days,
                created_at = payment.CreatedAt,
                used_at = payment.UsedAt,
                confirmed_at = payment.ConfirmedAt,
                rejected_reason = payment.RejectedReason
            };
        }));
    }

    [HttpGet("/api/owner/payments")]
    public async Task<IActionResult> GetOwnerPayments([FromQuery] int ownerId, [FromQuery] string? status = null, [FromQuery] string? type = null)
    {
        var forbidden = await EnsureOwnerAsync(ownerId);
        if (forbidden != null) return forbidden;

        var query = _db.Payments.Where(x => x.OwnerId == ownerId);
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(type) && type != "all")
            query = query.Where(x => x.PaymentType == type);

        var payments = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        var poiIds = payments.Where(x => !string.IsNullOrWhiteSpace(x.PoiId)).Select(x => x.PoiId!).Distinct().ToList();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();

        return Ok(payments.Select(payment =>
        {
            var poi = !string.IsNullOrWhiteSpace(payment.PoiId) ? pois.FirstOrDefault(x => x.Id == payment.PoiId) : null;
            return ToPaymentStatusResponse(payment, null, poi?.Name);
        }));
    }

    [HttpGet("/api/owner/payments/status")]
    public async Task<IActionResult> GetOwnerPaymentStatus([FromQuery] string code, [FromQuery] int ownerId)
    {
        var forbidden = await EnsureOwnerAsync(ownerId);
        if (forbidden != null) return forbidden;

        var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Code == code && x.OwnerId == ownerId);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy thanh toán" });

        var poi = !string.IsNullOrWhiteSpace(payment.PoiId) ? await _db.Pois.FindAsync(payment.PoiId) : null;
        return Ok(ToPaymentStatusResponse(payment, null, poi?.Name));
    }

    [HttpPost("/api/owner/payments/submit")]
    public async Task<IActionResult> ResubmitOwnerPayment([FromQuery] string code, [FromQuery] int ownerId)
    {
        var forbidden = await EnsureOwnerAsync(ownerId);
        if (forbidden != null) return forbidden;

        var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Code == code && x.OwnerId == ownerId);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy thanh toán" });

        payment.Status = "submitted";
        payment.RejectedReason = null;
        await _db.SaveChangesAsync();

        var poi = !string.IsNullOrWhiteSpace(payment.PoiId) ? await _db.Pois.FindAsync(payment.PoiId) : null;
        return Ok(new { message = "Đã gửi lại yêu cầu xác minh", payment = ToPaymentStatusResponse(payment, null, poi?.Name) });
    }

    [HttpGet("/api/admin/payments")]
    public async Task<IActionResult> GetAdminPayments([FromQuery] int adminId, [FromQuery] string? status = null, [FromQuery] string? type = null)
    {
        var forbidden = await EnsureAdminAsync(adminId);
        if (forbidden != null) return forbidden;

        var query = _db.Payments.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(type) && type != "all")
            query = query.Where(x => x.PaymentType == type);

        var payments = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        var ownerIds = payments.Where(x => x.OwnerId.HasValue).Select(x => x.OwnerId!.Value).Distinct().ToList();
        var deviceIds = payments.Where(x => x.DeviceId.HasValue).Select(x => x.DeviceId!.Value).Distinct().ToList();
        var poiIds = payments.Where(x => !string.IsNullOrWhiteSpace(x.PoiId)).Select(x => x.PoiId!).Distinct().ToList();
        var planIds = payments.Where(x => x.PlanId.HasValue).Select(x => x.PlanId!.Value).Distinct().ToList();

        var owners = await _db.Users.Where(x => ownerIds.Contains(x.Id)).ToListAsync();
        var devices = await _db.Devices.Where(x => deviceIds.Contains(x.Id)).ToListAsync();
        var pois = await _db.Pois.Where(x => poiIds.Contains(x.Id)).ToListAsync();
        var plans = await _db.Plans.Where(x => planIds.Contains(x.Id)).ToListAsync();

        return Ok(payments.Select(payment =>
        {
            var owner = payment.OwnerId.HasValue ? owners.FirstOrDefault(x => x.Id == payment.OwnerId.Value) : null;
            var device = payment.DeviceId.HasValue ? devices.FirstOrDefault(x => x.Id == payment.DeviceId.Value) : null;
            var poi = !string.IsNullOrWhiteSpace(payment.PoiId) ? pois.FirstOrDefault(x => x.Id == payment.PoiId) : null;
            var plan = payment.PlanId.HasValue ? plans.FirstOrDefault(x => x.Id == payment.PlanId.Value) : null;
            return new
            {
                payment.Id,
                payment.Code,
                payment.Amount,
                payment.Status,
                status_label = PaymentStatusLabel(payment.Status),
                payment_type = payment.PaymentType,
                payer_type = payment.PayerType,
                payment.OwnerId,
                owner_name = owner?.UserName,
                payment.DeviceId,
                device_name = device?.Name,
                payment.PoiId,
                poi_name = poi?.Name,
                plan_name = plan?.Name,
                description = payment.Description ?? plan?.Name ?? "Thanh toán",
                created_at = payment.CreatedAt,
                used_at = payment.UsedAt,
                confirmed_at = payment.ConfirmedAt,
                rejected_reason = payment.RejectedReason
            };
        }));
    }

    [HttpPut("/api/admin/payments/{id}/status")]
    public async Task<IActionResult> UpdatePaymentStatus(int id, [FromQuery] int adminId, [FromBody] UpdatePaymentStatusRequest request)
    {
        var forbidden = await EnsureAdminAsync(adminId);
        if (forbidden != null) return forbidden;

        if (request.Status is not ("pending" or "submitted" or "confirmed" or "rejected" or "used"))
            return BadRequest(new { message = "Trạng thái thanh toán không hợp lệ" });

        var payment = await _db.Payments.FindAsync(id);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy thanh toán" });

        if (request.Status == "confirmed")
        {
            if (payment.PaymentType == "user_plan")
            {
                await ActivateUserPlanAsync(payment);
            }
            else
            {
                payment.Status = "confirmed";
                payment.ConfirmedAt = DateTime.UtcNow;
                payment.RejectedReason = null;
            }
        }
        else
        {
            payment.Status = request.Status;
            payment.RejectedReason = request.Status == "rejected" ? request.Reason : null;
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã cập nhật thanh toán", payment = ToPaymentStatusResponse(payment) });
    }
}

public class UpdatePaymentStatusRequest
{
    public string Status { get; set; } = "submitted";
    public string? Reason { get; set; }
}
