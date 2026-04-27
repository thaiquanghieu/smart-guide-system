using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Globalization;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private static readonly Regex PaymentCodeRegex = new(@"(SGPAY|SGUP|SGQR)_?[A-Za-z0-9]+", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly HttpClient SepayHttpClient = new();
    private static readonly TimeSpan PaymentPendingTimeout = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public PaymentsController(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    private string SepayBank => _configuration["SEPAY_BANK"] ?? "Techcombank";
    private string SepayAccountNumber => _configuration["SEPAY_ACCOUNT_NUMBER"] ?? "4001012005";
    private string SepayAccountName => _configuration["SEPAY_ACCOUNT_NAME"] ?? "THAI QUANG HIEU";
    private string? SepayApiKey => _configuration["SEPAY_API_KEY"];
    private string? SepayWebhookSecret => _configuration["SEPAY_WEBHOOK_SECRET"];

    private async Task<Device?> GetActiveDeviceAsync(int deviceId)
    {
        if (deviceId <= 0)
            return null;

        return await _db.Devices.FirstOrDefaultAsync(x => x.Id == deviceId && x.IsActive);
    }

    private static string PaymentStatusLabel(Payment payment)
    {
        if (payment.Status == "rejected" &&
            !string.IsNullOrWhiteSpace(payment.RejectedReason) &&
            payment.RejectedReason.Contains("hết thời gian chờ", StringComparison.OrdinalIgnoreCase))
        {
            return "Đã hết hạn";
        }

        return payment.Status switch
        {
            "submitted" => "Đang kiểm tra giao dịch",
            "confirmed" => "Thanh toán thành công",
            "rejected" => "Chưa ghi nhận giao dịch",
            "used" => "Thanh toán thành công",
            _ => "Đang chờ"
        };
    }

    private string BuildSepayQrUrl(int amount, string code)
    {
        var accountNumber = Uri.EscapeDataString(SepayAccountNumber);
        var bank = Uri.EscapeDataString(SepayBank);
        var description = Uri.EscapeDataString(code);
        return $"https://qr.sepay.vn/img?acc={accountNumber}&bank={bank}&amount={amount}&des={description}&template=compact2";
    }

    private string BuildDescription(Payment payment, string? planName = null, string? poiName = null)
    {
        return payment.Description ?? planName ?? poiName ?? "Thanh toán";
    }

    private string? GetDraftPoiName(Payment payment)
    {
        return PoiDraftWorkflow.ExtractPoiName(payment.DraftPayload);
    }

    private object ToPaymentStatusResponse(Payment payment, string? planName = null, string? poiName = null)
    {
        var resolvedPoiName = poiName ?? GetDraftPoiName(payment);

        return new
        {
            payment.Id,
            payment.Code,
            payment.Amount,
            payment.Status,
            status_label = PaymentStatusLabel(payment),
            payment_type = payment.PaymentType,
            payer_type = payment.PayerType,
            payment.DeviceId,
            payment.OwnerId,
            payment.PoiId,
            plan_name = planName,
            poi_name = resolvedPoiName,
            description = BuildDescription(payment, planName, resolvedPoiName),
            created_at = payment.CreatedAt,
            used_at = payment.UsedAt,
            confirmed_at = payment.ConfirmedAt,
            rejected_reason = payment.RejectedReason,
            provider = payment.Provider,
            provider_transaction_id = payment.ProviderTransactionId,
            provider_reference_code = payment.ProviderReferenceCode,
            paid_amount = payment.PaidAmount,
            paid_at = payment.PaidAt
        };
    }

    private object ToCheckoutResponse(Payment payment, Plan? plan = null, string? poiName = null)
    {
        var resolvedPoiName = poiName ?? GetDraftPoiName(payment);
        return new
        {
            payment.Id,
            payment.Code,
            payment.Amount,
            payment.Status,
            status_label = PaymentStatusLabel(payment),
            payment_type = payment.PaymentType,
            payer_type = payment.PayerType,
            plan = plan == null
                ? null
                : new
                {
                    plan.Id,
                    plan.Name,
                    plan.Days,
                    plan.Price
                },
            poi_name = resolvedPoiName,
            description = BuildDescription(payment, plan?.Name, resolvedPoiName),
            qr_url = BuildSepayQrUrl(payment.Amount, payment.Code),
            bank_name = SepayBank,
            account_number = SepayAccountNumber,
            account_name = SepayAccountName,
            created_at = payment.CreatedAt,
            confirmed_at = payment.ConfirmedAt,
            rejected_reason = payment.RejectedReason
        };
    }

    private async Task<bool> ExpirePaymentIfNeededAsync(Payment payment)
    {
        if (payment.IsUsed || payment.Status is not "pending")
            return false;

        var startedAt = payment.SubmittedAt ?? payment.CreatedAt;
        if (DateTime.UtcNow - startedAt < PaymentPendingTimeout)
            return false;

        payment.Status = "rejected";
        payment.RejectedReason = "Giao dịch đã hết thời gian chờ. Vui lòng tạo giao dịch mới để tiếp tục.";
        await _db.SaveChangesAsync();
        return true;
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
        payment.PaidAt ??= now;
        payment.Status = "used";
        payment.RejectedReason = null;
    }

    private async Task ConfirmPoiUpgradeAsync(Payment payment)
    {
        var now = DateTime.UtcNow;

        if (string.IsNullOrWhiteSpace(payment.PoiId))
        {
            if (!payment.OwnerId.HasValue)
                throw new InvalidOperationException("Thiếu owner để tạo POI từ thanh toán nâng cấp.");

            var draft = PoiDraftWorkflow.DeserializeRequest(payment.DraftPayload);
            if (draft == null)
                throw new InvalidOperationException("Không tìm thấy dữ liệu POI nháp để hoàn tất thanh toán.");

            await using var transaction = await _db.Database.BeginTransactionAsync();

            var poi = await PoiDraftWorkflow.CreatePoiFromDraftAsync(_db, draft, payment.OwnerId.Value, now);
            payment.PoiId = poi.Id;
            payment.IsUsed = true;
            payment.UsedAt = now;
            payment.ConfirmedAt = now;
            payment.PaidAt ??= now;
            payment.Status = "used";
            payment.RejectedReason = null;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return;
        }

        payment.IsUsed = true;
        payment.UsedAt = now;
        payment.ConfirmedAt = now;
        payment.PaidAt ??= now;
        payment.Status = "used";
        payment.RejectedReason = null;
    }

    private async Task ApplySuccessfulPaymentAsync(
        Payment payment,
        string? providerTransactionId = null,
        string? providerReferenceCode = null,
        int? paidAmount = null,
        DateTime? paidAt = null,
        string? providerPayload = null)
    {
        payment.Provider = "sepay";
        payment.ProviderTransactionId = providerTransactionId ?? payment.ProviderTransactionId;
        payment.ProviderReferenceCode = providerReferenceCode ?? payment.ProviderReferenceCode;
        payment.PaidAmount = paidAmount ?? payment.PaidAmount ?? payment.Amount;
        payment.PaidAt = paidAt ?? payment.PaidAt ?? DateTime.UtcNow;
        payment.ProviderPayload = providerPayload ?? payment.ProviderPayload;

        if (payment.PaymentType == "user_plan")
        {
            await ActivateUserPlanAsync(payment);
            return;
        }

        if (payment.PaymentType == "poi_upgrade")
        {
            await ConfirmPoiUpgradeAsync(payment);
            return;
        }

        payment.IsUsed = true;
        payment.UsedAt = DateTime.UtcNow;
        payment.ConfirmedAt = DateTime.UtcNow;
        payment.Status = "used";
        payment.RejectedReason = null;
    }

    private bool IsValidSepayWebhook()
    {
        if (string.IsNullOrWhiteSpace(SepayWebhookSecret))
            return true;

        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.Equals($"Apikey {SepayWebhookSecret}", StringComparison.Ordinal))
            return true;

        if (authHeader.Equals($"ApiKey {SepayWebhookSecret}", StringComparison.Ordinal))
            return true;

        var secretHeader = Request.Headers["X-Secret-Key"].ToString();
        return secretHeader.Equals(SepayWebhookSecret, StringComparison.Ordinal);
    }

    private static string? ResolvePaymentCode(SepayWebhookRequest payload)
    {
        if (!string.IsNullOrWhiteSpace(payload.Code))
            return payload.Code.Trim();

        if (!string.IsNullOrWhiteSpace(payload.PaymentCodeSnake))
            return payload.PaymentCodeSnake.Trim();

        var combined = string.Join(" ", new[]
        {
            payload.Content,
            payload.Description,
            payload.ReferenceCode,
            payload.ReferenceCodeSnake
        }.Where(value => !string.IsNullOrWhiteSpace(value)));

        if (string.IsNullOrWhiteSpace(combined))
            return null;

        var match = PaymentCodeRegex.Match(combined);
        return match.Success ? match.Value.Trim() : null;
    }

    private static string NormalizePaymentCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var chars = value
            .Trim()
            .Where(char.IsLetterOrDigit)
            .Select(char.ToUpperInvariant)
            .ToArray();

        return new string(chars);
    }

    private sealed class SepayTransactionCandidate
    {
        public string? Id { get; init; }
        public string? Code { get; init; }
        public string? TransactionContent { get; init; }
        public string? ReferenceNumber { get; init; }
        public string? TransactionDate { get; init; }
        public string? AmountIn { get; init; }
        public string? RawPayload { get; init; }
    }

    private static IEnumerable<SepayTransactionCandidate> ExtractSepayTransactions(JsonElement root)
    {
        if (root.TryGetProperty("transactions", out var v1Transactions) && v1Transactions.ValueKind == JsonValueKind.Array)
        {
            foreach (var transaction in v1Transactions.EnumerateArray())
            {
                yield return new SepayTransactionCandidate
                {
                    Id = transaction.TryGetProperty("id", out var idElement) ? idElement.GetString() : null,
                    Code = transaction.TryGetProperty("code", out var codeElement) ? codeElement.GetString() : null,
                    TransactionContent = transaction.TryGetProperty("transaction_content", out var contentElement) ? contentElement.GetString() : null,
                    ReferenceNumber = transaction.TryGetProperty("reference_number", out var referenceElement) ? referenceElement.GetString() : null,
                    TransactionDate = transaction.TryGetProperty("transaction_date", out var dateElement) ? dateElement.GetString() : null,
                    AmountIn = transaction.TryGetProperty("amount_in", out var amountElement) ? amountElement.GetString() : null,
                    RawPayload = transaction.GetRawText()
                };
            }
        }

        if (root.TryGetProperty("data", out var v2Transactions) && v2Transactions.ValueKind == JsonValueKind.Array)
        {
            foreach (var transaction in v2Transactions.EnumerateArray())
            {
                yield return new SepayTransactionCandidate
                {
                    Id = transaction.TryGetProperty("id", out var idElement) ? idElement.GetString() : null,
                    Code = transaction.TryGetProperty("code", out var codeElement) ? codeElement.GetString() : null,
                    TransactionContent = transaction.TryGetProperty("transaction_content", out var contentElement) ? contentElement.GetString() : null,
                    ReferenceNumber = transaction.TryGetProperty("reference_number", out var referenceElement) ? referenceElement.GetString() : null,
                    TransactionDate = transaction.TryGetProperty("transaction_date", out var dateElement) ? dateElement.GetString() : null,
                    AmountIn = transaction.TryGetProperty("amount_in", out var amountElement) ? amountElement.ToString() : null,
                    RawPayload = transaction.GetRawText()
                };
            }
        }
    }

    private async Task<bool> TrySyncPaymentFromSepayAsync(Payment payment)
    {
        await ExpirePaymentIfNeededAsync(payment);

        if (payment.IsUsed || payment.Status is "used" or "confirmed")
            return false;

        if (string.IsNullOrWhiteSpace(SepayApiKey))
            return false;

        var normalizedCode = NormalizePaymentCode(payment.Code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
            return false;

        foreach (var requestUrl in BuildSepayTransactionLookupUrls(payment))
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", SepayApiKey);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");

            using var response = await SepayHttpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                continue;

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);

            foreach (var transaction in ExtractSepayTransactions(document.RootElement))
            {
                var codeFromApi = transaction.Code;
                var contentFromApi = transaction.TransactionContent;
                var amountIn = transaction.AmountIn;
                var normalizedCandidates = new[]
                {
                    NormalizePaymentCode(codeFromApi),
                    NormalizePaymentCode(contentFromApi),
                    NormalizePaymentCode(transaction.ReferenceNumber)
                };

                var matchesCode = normalizedCandidates.Any(candidate => !string.IsNullOrWhiteSpace(candidate) && candidate.Contains(normalizedCode, StringComparison.OrdinalIgnoreCase));
                if (!matchesCode)
                    continue;

                if (decimal.TryParse(amountIn, NumberStyles.Any, CultureInfo.InvariantCulture, out var paidAmountDecimal) &&
                    paidAmountDecimal < payment.Amount)
                {
                    continue;
                }

                var transactionId = transaction.Id;
                var referenceNumber = transaction.ReferenceNumber;
                var transactionDate = transaction.TransactionDate;

                DateTime? paidAt = null;
                if (!string.IsNullOrWhiteSpace(transactionDate) &&
                    DateTime.TryParse(transactionDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsedDate))
                {
                    paidAt = parsedDate.ToUniversalTime();
                }

                await ApplySuccessfulPaymentAsync(
                    payment,
                    providerTransactionId: transactionId,
                    providerReferenceCode: referenceNumber,
                    paidAmount: (int?)Math.Round(paidAmountDecimal),
                    paidAt: paidAt,
                    providerPayload: transaction.RawPayload);

                await _db.SaveChangesAsync();
                return true;
            }
        }

        return false;
    }

    private IEnumerable<string> BuildSepayTransactionLookupUrls(Payment payment)
    {
        var transactionDateMin = Uri.EscapeDataString(payment.CreatedAt.AddDays(-2).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture));
        var baseUrl = $"https://my.sepay.vn/userapi/transactions/list?transaction_date_min={transactionDateMin}&amount_in={payment.Amount}&limit=50";
        var v2DateFrom = Uri.EscapeDataString(payment.CreatedAt.AddDays(-2).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture));
        var v2DateTo = Uri.EscapeDataString(DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture));
        var normalizedCode = Uri.EscapeDataString(NormalizePaymentCode(payment.Code));
        var rawCode = Uri.EscapeDataString(payment.Code);
        var bankBrand = Uri.EscapeDataString(SepayBank);
        var v2BaseUrl = $"https://userapi.sepay.vn/v2/transactions?transfer_type=in&transaction_date_from={v2DateFrom}&transaction_date_to={v2DateTo}&amount_in_min={payment.Amount}&amount_in_max={payment.Amount}&per_page=100";

        yield return $"{baseUrl}&account_number={Uri.EscapeDataString(SepayAccountNumber)}";
        yield return baseUrl;
        yield return $"{v2BaseUrl}&q={normalizedCode}&bank_brand_name={bankBrand}";
        yield return $"{v2BaseUrl}&q={rawCode}";
        yield return $"{v2BaseUrl}&transaction_content={normalizedCode}";
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

    [HttpPost("create")]
    public async Task<IActionResult> CreatePayment(int deviceId, int planId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return BadRequest(new { message = "Thiết bị không hợp lệ hoặc đã bị khóa" });

        var plan = await _db.Plans.FindAsync(planId);
        if (plan == null)
            return BadRequest(new { message = "Plan không tồn tại" });

        var payment = new Payment
        {
            DeviceId = deviceId,
            PlanId = planId,
            Code = $"SGPAY{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
            PayerType = "device",
            PaymentType = "user_plan",
            Provider = "sepay",
            Amount = plan.Price,
            Status = "pending",
            Description = $"Mua {plan.Name}",
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(ToCheckoutResponse(payment, plan));
    }

    [HttpPost("/api/owner/payments/prepare-poi-upgrade")]
    public async Task<IActionResult> PreparePoiUpgradePayment([FromBody] CreatePoiRequest request, [FromQuery] int ownerId)
    {
        var forbidden = await EnsureOwnerAsync(ownerId);
        if (forbidden != null) return forbidden;

        var validationError = PoiDraftWorkflow.Validate(request);
        if (!string.IsNullOrWhiteSpace(validationError))
            return BadRequest(new { message = validationError });

        if (request.UpgradeAmount <= 0)
            return BadRequest(new { message = "POI này không có gói nâng cấp cần thanh toán." });

        var payment = new Payment
        {
            OwnerId = ownerId,
            PayerType = "seller",
            PaymentType = "poi_upgrade",
            Provider = "sepay",
            Amount = request.UpgradeAmount,
            Status = "pending",
            Code = string.IsNullOrWhiteSpace(request.UpgradePaymentCode)
                ? $"SGUP{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}"
                : request.UpgradePaymentCode.Trim(),
            Description = string.IsNullOrWhiteSpace(request.UpgradeDescription)
                ? $"Nâng cấp POI: {request.Name}"
                : request.UpgradeDescription.Trim(),
            DraftPayload = PoiDraftWorkflow.SerializeRequest(request),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(ToCheckoutResponse(payment, null, request.Name));
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

        await ExpirePaymentIfNeededAsync(payment);

        if (payment.Status is "used" or "confirmed")
            return Ok(new { message = "Thanh toán đã được xác nhận trước đó", payment = ToPaymentStatusResponse(payment) });

        payment.Status = "pending";
        payment.SubmittedAt = DateTime.UtcNow;
        payment.RejectedReason = null;
        await _db.SaveChangesAsync();

        var synced = await TrySyncPaymentFromSepayAsync(payment);
        return Ok(new
        {
            message = synced
                ? "Đã xác nhận giao dịch thành công."
                : "Chưa ghi nhận giao dịch. Vui lòng chờ thêm hoặc kiểm tra lại nội dung chuyển khoản.",
            payment = ToPaymentStatusResponse(payment)
        });
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

        await TrySyncPaymentFromSepayAsync(payment);

        var plan = payment.PlanId.HasValue ? await _db.Plans.FindAsync(payment.PlanId.Value) : null;
        return Ok(ToCheckoutResponse(payment, plan));
    }

    [HttpPost("sepay/webhook")]
    public async Task<IActionResult> HandleSepayWebhook([FromBody] SepayWebhookRequest payload)
    {
        if (!IsValidSepayWebhook())
            return Unauthorized(new { message = "Webhook SePay không hợp lệ" });

        var paymentCode = ResolvePaymentCode(payload);
        if (string.IsNullOrWhiteSpace(paymentCode))
            return Ok(new { message = "Không tìm thấy mã thanh toán hợp lệ" });

        var normalizedIncomingCode = NormalizePaymentCode(paymentCode);
        var payment = _db.Payments
            .AsEnumerable()
            .FirstOrDefault(x => NormalizePaymentCode(x.Code) == normalizedIncomingCode);
        if (payment == null)
            return Ok(new { message = "Không tìm thấy payment tương ứng", code = paymentCode, normalized_code = normalizedIncomingCode });

        if (payment.IsUsed || payment.Status == "used")
            return Ok(new { message = "Payment đã được xử lý trước đó", code = paymentCode });

        var webhookAmount = payload.TransferAmount > 0 ? payload.TransferAmount : payload.AmountSnake;
        if (webhookAmount > 0 && webhookAmount < payment.Amount)
            return Ok(new { message = "Số tiền chuyển chưa đủ để xác nhận", code = paymentCode, expected = payment.Amount, actual = webhookAmount });

        DateTime paidAt = payload.TransactionDate ?? DateTime.UtcNow;
        if (!payload.TransactionDate.HasValue &&
            !string.IsNullOrWhiteSpace(payload.TransactionDateSnake) &&
            DateTime.TryParse(payload.TransactionDateSnake, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsedWebhookDate))
        {
            paidAt = parsedWebhookDate.ToUniversalTime();
        }

        await ApplySuccessfulPaymentAsync(
            payment,
            providerTransactionId: payload.Id?.ToString() ?? payload.TransactionIdSnake,
            providerReferenceCode: payload.ReferenceCode ?? payload.ReferenceCodeSnake,
            paidAmount: webhookAmount > 0 ? webhookAmount : null,
            paidAt: DateTime.SpecifyKind(paidAt, DateTimeKind.Utc),
            providerPayload: JsonSerializer.Serialize(payload));

        await _db.SaveChangesAsync();

        return Ok(new { success = true, code = paymentCode, status = payment.Status });
    }

    [HttpGet("check")]
    public async Task<IActionResult> Check(int deviceId)
    {
        var device = await GetActiveDeviceAsync(deviceId);
        if (device == null)
            return Ok(new { isActive = false, reason = "device_inactive" });

        var sub = await _db.Subscriptions.FirstOrDefaultAsync(x => x.DeviceId == deviceId);
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
                status_label = PaymentStatusLabel(payment),
                payment_type = payment.PaymentType,
                description = BuildDescription(payment, plan?.Name, null),
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

        await TrySyncPaymentFromSepayAsync(payment);

        var poi = !string.IsNullOrWhiteSpace(payment.PoiId) ? await _db.Pois.FindAsync(payment.PoiId) : null;
        return Ok(ToCheckoutResponse(payment, null, poi?.Name));
    }

    [HttpPost("/api/owner/payments/submit")]
    public async Task<IActionResult> ResubmitOwnerPayment([FromQuery] string code, [FromQuery] int ownerId)
    {
        var forbidden = await EnsureOwnerAsync(ownerId);
        if (forbidden != null) return forbidden;

        var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Code == code && x.OwnerId == ownerId);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy thanh toán" });

        await ExpirePaymentIfNeededAsync(payment);

        if (payment.Status is "used" or "confirmed")
            return Ok(new { message = "Thanh toán đã được xác nhận trước đó", payment = ToPaymentStatusResponse(payment) });

        payment.Status = "pending";
        payment.SubmittedAt = DateTime.UtcNow;
        payment.RejectedReason = null;
        await _db.SaveChangesAsync();

        var synced = await TrySyncPaymentFromSepayAsync(payment);
        var poi = !string.IsNullOrWhiteSpace(payment.PoiId) ? await _db.Pois.FindAsync(payment.PoiId) : null;
        return Ok(new
        {
            message = synced
                ? "Đã xác nhận giao dịch thành công."
                : "Chưa ghi nhận giao dịch. Vui lòng chờ thêm hoặc kiểm tra lại nội dung chuyển khoản.",
            payment = ToPaymentStatusResponse(payment, null, poi?.Name)
        });
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
                status_label = PaymentStatusLabel(payment),
                payment_type = payment.PaymentType,
                payer_type = payment.PayerType,
                payment.OwnerId,
                owner_name = owner?.UserName,
                payment.DeviceId,
                device_name = device?.Name,
                payment.PoiId,
                poi_name = poi?.Name ?? GetDraftPoiName(payment),
                plan_name = plan?.Name,
                description = BuildDescription(payment, plan?.Name, poi?.Name ?? GetDraftPoiName(payment)),
                created_at = payment.CreatedAt,
                used_at = payment.UsedAt,
                confirmed_at = payment.ConfirmedAt,
                rejected_reason = payment.RejectedReason,
                provider = payment.Provider,
                provider_transaction_id = payment.ProviderTransactionId,
                provider_reference_code = payment.ProviderReferenceCode,
                paid_amount = payment.PaidAmount,
                paid_at = payment.PaidAt
            };
        }));
    }

    [HttpGet("sepay/debug-match")]
    public async Task<IActionResult> DebugSepayMatch([FromQuery] int adminId, [FromQuery] string code)
    {
        var forbidden = await EnsureAdminAsync(adminId);
        if (forbidden != null) return forbidden;

        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { message = "Thiếu code thanh toán" });

        var normalizedCode = NormalizePaymentCode(code);
        var recentPayments = await _db.Payments
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync();

        var payment = recentPayments
            .FirstOrDefault(x => NormalizePaymentCode(x.Code) == normalizedCode);

        if (payment == null)
            return NotFound(new { message = "Không tìm thấy payment trong DB", code, normalized_code = normalizedCode });

        if (string.IsNullOrWhiteSpace(SepayApiKey))
        {
            return Ok(new
            {
                message = "Thiếu SEPAY_API_KEY trên Railway",
                payment = ToPaymentStatusResponse(payment)
            });
        }

        var attempts = new List<object>();
        foreach (var requestUrl in BuildSepayTransactionLookupUrls(payment))
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", SepayApiKey);
            request.Headers.TryAddWithoutValidation("Accept", "application/json");

            using var response = await SepayHttpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            var matched = new List<object>();
            if (response.IsSuccessStatusCode)
            {
                try
                {
                    using var document = JsonDocument.Parse(body);
                    foreach (var transaction in ExtractSepayTransactions(document.RootElement))
                    {
                        var codeFromApi = transaction.Code;
                        var contentFromApi = transaction.TransactionContent;
                        var amountIn = transaction.AmountIn;
                        var normalizedCandidates = new[]
                        {
                            NormalizePaymentCode(codeFromApi),
                            NormalizePaymentCode(contentFromApi),
                            NormalizePaymentCode(transaction.ReferenceNumber)
                        };
                        var matchesCode = normalizedCandidates.Any(candidate => !string.IsNullOrWhiteSpace(candidate) && candidate.Contains(normalizedCode, StringComparison.OrdinalIgnoreCase));

                        matched.Add(new
                        {
                            id = transaction.Id,
                            code = codeFromApi,
                            transaction_content = contentFromApi,
                            reference_number = transaction.ReferenceNumber,
                            amount_in = amountIn,
                            transaction_date = transaction.TransactionDate,
                            matches_code = matchesCode
                        });
                    }
                }
                catch
                {
                    // debug response keeps raw body below
                }
            }

            attempts.Add(new
            {
                url = requestUrl,
                status_code = (int)response.StatusCode,
                is_success = response.IsSuccessStatusCode,
                body_preview = body.Length > 4000 ? body[..4000] : body,
                parsed_transactions = matched
            });
        }

        return Ok(new
        {
            payment = ToPaymentStatusResponse(payment),
            normalized_code = normalizedCode,
            sepay_account = SepayAccountNumber,
            lookup_attempts = attempts
        });
    }

    [HttpPut("/api/admin/payments/{id}/status")]
    public async Task<IActionResult> UpdatePaymentStatus(int id, [FromQuery] int adminId, [FromBody] UpdatePaymentStatusRequest request)
    {
        var forbidden = await EnsureAdminAsync(adminId);
        if (forbidden != null) return forbidden;

        var payment = await _db.Payments.FindAsync(id);
        if (payment == null)
            return NotFound(new { message = "Không tìm thấy thanh toán" });

        await TrySyncPaymentFromSepayAsync(payment);

        return Ok(new
        {
            message = payment.Status is "used" or "confirmed"
                ? "Thanh toán đã được SePay xác nhận tự động."
                : "Thanh toán này chỉ được xác nhận tự động từ SePay, admin không duyệt tay.",
            payment = ToPaymentStatusResponse(payment)
        });
    }
}

public class UpdatePaymentStatusRequest
{
    public string Status { get; set; } = "submitted";
    public string? Reason { get; set; }
}

public class SepayWebhookRequest
{
    [JsonPropertyName("id")]
    public long? Id { get; set; }
    [JsonPropertyName("gateway")]
    public string? Gateway { get; set; }
    [JsonPropertyName("transactionDate")]
    public DateTime? TransactionDate { get; set; }
    [JsonPropertyName("accountNumber")]
    public string? AccountNumber { get; set; }
    [JsonPropertyName("subAccount")]
    public string? SubAccount { get; set; }
    [JsonPropertyName("content")]
    public string? Content { get; set; }
    [JsonPropertyName("code")]
    public string? Code { get; set; }
    [JsonPropertyName("referenceCode")]
    public string? ReferenceCode { get; set; }
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    [JsonPropertyName("transferType")]
    public string? TransferType { get; set; }
    [JsonPropertyName("transferAmount")]
    public int TransferAmount { get; set; }
    [JsonPropertyName("accumulated")]
    public long? Accumulated { get; set; }

    [JsonPropertyName("transaction_id")]
    public string? TransactionIdSnake { get; set; }

    [JsonPropertyName("transaction_date")]
    public string? TransactionDateSnake { get; set; }

    [JsonPropertyName("account_number")]
    public string? AccountNumberSnake { get; set; }

    [JsonPropertyName("payment_code")]
    public string? PaymentCodeSnake { get; set; }

    [JsonPropertyName("reference_code")]
    public string? ReferenceCodeSnake { get; set; }

    [JsonPropertyName("transfer_type")]
    public string? TransferTypeSnake { get; set; }

    [JsonPropertyName("amount")]
    public int? AmountSnake { get; set; }
}
