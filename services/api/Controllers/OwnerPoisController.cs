using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using System.Text.Json;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/owner/pois")]
public class OwnerPoisController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private static readonly HttpClient TranslationClient = new();

    public OwnerPoisController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    // =========================
    // GET POIs BY OWNER
    // =========================
    [HttpGet]
    public async Task<IActionResult> GetMyPois([FromQuery] int ownerId)
    {
        var pois = await _db.Pois
            .Where(x => x.OwnerId == ownerId)
            .ToListAsync();

        var poiImages = await _db.PoiImages.OrderBy(x => x.SortOrder).ToListAsync();
        var audioGuides = await _db.AudioGuides.ToListAsync();
        var translations = await _db.PoiTranslations.ToListAsync();

        var result = pois.Select(p => new
        {
            p.Id,
            p.Name,
            p.Category,
            categories = DeserializeCategories(p.CategoriesJson, p.Category),
            p.ShortDescription,
            p.Description,
            p.Address,
            p.OpenTime,
            p.CloseTime,
            p.PriceText,
            p.Phone,
            p.WebsiteUrl,
            p.Radius,
            p.Priority,
            p.Status,
            p.RejectedReason,
            p.Latitude,
            p.Longitude,
            listened_count = p.ListenedCount,
            rating_avg = p.RatingAvg,
            rating_count = p.RatingCount,
            created_at = p.CreatedAt,
            updated_at = p.UpdatedAt,

            images = poiImages
                .Where(i => i.PoiId == p.Id)
                .OrderBy(i => i.SortOrder)
                .Select(i => i.ImageUrl)
                .ToList(),

            audios = audioGuides
                .Where(a => a.PoiId == p.Id)
                .Select(a => new
                {
                    a.Id,
                    a.LanguageCode,
                    a.LanguageName,
                    a.ScriptText,
                    a.ApprovalStatus,
                    a.RejectedReason
                })
                .ToList(),

            translations = translations
                .Where(t => t.PoiId == p.Id)
                .Select(t => new
                {
                    t.LanguageCode,
                    t.Name,
                    t.Category,
                    t.ShortDescription,
                    t.Description,
                    t.Address,
                    t.PriceText
                })
                .ToList()
        });

        return Ok(result);
    }

    // =========================
    // GET POI BY ID (Owner Only)
    // =========================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPoi(string id, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền truy cập POI này");

        var images = await _db.PoiImages
            .Where(i => i.PoiId == id)
            .OrderBy(i => i.SortOrder)
            .Select(i => i.ImageUrl)
            .ToListAsync();

        var audios = await _db.AudioGuides
            .Where(a => a.PoiId == id)
            .Select(a => new
            {
                a.Id,
                a.LanguageCode,
                a.LanguageName,
                a.VoiceName,
                a.ScriptText,
                a.AudioUrl,
                a.ApprovalStatus,
                a.RejectedReason
            })
            .ToListAsync();

        var translations = await _db.PoiTranslations
            .Where(t => t.PoiId == id)
            .Select(t => new
            {
                t.LanguageCode,
                t.Name,
                t.Category,
                t.ShortDescription,
                t.Description,
                t.Address,
                t.PriceText
            })
            .ToListAsync();

        return Ok(new
        {
            poi.Id,
            poi.Name,
            poi.Category,
            categories = DeserializeCategories(poi.CategoriesJson, poi.Category),
            poi.ShortDescription,
            poi.Description,
            poi.Address,
            poi.OpenTime,
            poi.CloseTime,
            poi.PriceText,
            poi.Phone,
            poi.WebsiteUrl,
            poi.Radius,
            poi.Priority,
            poi.Status,
            poi.RejectedReason,
            poi.Latitude,
            poi.Longitude,
            listened_count = poi.ListenedCount,
            rating_avg = poi.RatingAvg,
            rating_count = poi.RatingCount,
            created_at = poi.CreatedAt,
            updated_at = poi.UpdatedAt,
            images,
            audios,
            translations
        });
    }

    // =========================
    // CREATE POI
    // =========================
    [HttpPost("translate")]
    public async Task<IActionResult> Translate([FromBody] TranslateRequest request, [FromQuery] int ownerId)
    {
        var user = await _db.Users.FindAsync(ownerId);
        if (user == null || user.Role != "owner")
            return Forbid("Chỉ owner mới có thể dịch nội dung POI");

        if (string.IsNullOrWhiteSpace(request.Text))
            return Ok(new { text = "" });

        var sourceLanguage = string.IsNullOrWhiteSpace(request.SourceLanguage) ? "vi" : request.SourceLanguage.Trim();
        var targetLanguage = string.IsNullOrWhiteSpace(request.TargetLanguage) ? "en" : request.TargetLanguage.Trim();

        if (sourceLanguage == targetLanguage)
            return Ok(new { text = request.Text });

        try
        {
            var url =
                $"https://translate.googleapis.com/translate_a/single?client=gtx&sl={Uri.EscapeDataString(sourceLanguage)}&tl={Uri.EscapeDataString(targetLanguage)}&dt=t&q={Uri.EscapeDataString(request.Text)}";
            var json = await TranslationClient.GetStringAsync(url);
            using var document = JsonDocument.Parse(json);
            var segments = document.RootElement[0]
                .EnumerateArray()
                .Select(segment => segment[0].GetString())
                .Where(segment => !string.IsNullOrEmpty(segment));
            var translatedText = string.Join("", segments);

            return Ok(new { text = string.IsNullOrWhiteSpace(translatedText) ? request.Text : translatedText });
        }
        catch
        {
            return Ok(new { text = request.Text, fallback = true });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreatePoi([FromBody] CreatePoiRequest request, [FromQuery] int ownerId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên POI không được để trống" });

        if (request.Latitude < -90 || request.Latitude > 90)
            return BadRequest(new { message = "Latitude không hợp lệ" });

        if (request.Longitude < -180 || request.Longitude > 180)
            return BadRequest(new { message = "Longitude không hợp lệ" });

        var user = await _db.Users.FindAsync(ownerId);
        if (user == null || user.Role != "owner")
            return Forbid("Chỉ owner mới có thể tạo POI");

        var poi = new Poi
        {
            Id = Guid.NewGuid().ToString("N").Substring(0, 20),
            OwnerId = ownerId,
            Name = request.Name,
            ShortDescription = request.ShortDescription,
            Description = request.Description,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Radius = request.Radius ?? 100,
            Priority = request.Priority ?? 0,
            Status = "pending",
            Category = request.Category ?? "Khác",
            CategoriesJson = SerializeCategories(request.Categories, request.Category),
            OpenTime = request.OpenTime ?? "",
            CloseTime = request.CloseTime ?? "",
            PriceText = request.PriceText ?? "",
            Phone = request.Phone,
            WebsiteUrl = request.WebsiteUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            _db.Pois.Add(poi);
            await _db.SaveChangesAsync();

            SyncImages(poi.Id, request.Images);
            SyncTranslations(poi.Id, request.Translations);
            SyncAudios(poi.Id, request.Audios);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Không lưu được POI vào DB. Kiểm tra migration/schema và dữ liệu nhập.", detail = exception.InnerException?.Message ?? exception.Message });
        }

        return Ok(new { poi.Id, message = "POI được tạo thành công" });
    }

    [HttpPost("uploads/images")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadPoiImages([FromForm] List<IFormFile> files, [FromQuery] int ownerId)
    {
        var user = await _db.Users.FindAsync(ownerId);
        if (user == null || user.Role != "owner")
            return Forbid("Chỉ owner mới có thể upload ảnh");

        if (files == null || files.Count == 0)
            return BadRequest(new { message = "Chưa chọn ảnh" });

        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

        var uploadRoot = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "images", "pois");
        Directory.CreateDirectory(uploadRoot);

        var urls = new List<string>();

        foreach (var file in files)
        {
            if (file.Length <= 0)
                continue;

            if (file.Length > 5_000_000)
                return BadRequest(new { message = $"Ảnh {file.FileName} vượt quá 5MB" });

            var extension = Path.GetExtension(file.FileName);
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Chỉ hỗ trợ JPG, PNG, WEBP" });

            var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var filePath = Path.Combine(uploadRoot, fileName);

            await using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream);

            urls.Add($"/images/pois/{fileName}");
        }

        return Ok(new { urls });
    }

    // =========================
    // UPDATE POI
    // =========================
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePoi(string id, [FromBody] UpdatePoiRequest request, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền sửa POI này");

        if (!string.IsNullOrWhiteSpace(request.Name))
            poi.Name = request.Name;

        if (!string.IsNullOrWhiteSpace(request.Description))
            poi.Description = request.Description;

        if (request.ShortDescription != null)
            poi.ShortDescription = request.ShortDescription;

        if (!string.IsNullOrWhiteSpace(request.Address))
            poi.Address = request.Address;

        if (request.Latitude.HasValue)
            poi.Latitude = request.Latitude.Value;

        if (request.Longitude.HasValue)
            poi.Longitude = request.Longitude.Value;

        if (request.Radius.HasValue)
            poi.Radius = request.Radius.Value;

        if (request.Priority.HasValue)
            poi.Priority = request.Priority.Value;

        if (!string.IsNullOrWhiteSpace(request.Category))
            poi.Category = request.Category;

        if (request.Categories != null)
            poi.CategoriesJson = SerializeCategories(request.Categories, request.Category ?? poi.Category);

        if (request.OpenTime != null)
            poi.OpenTime = request.OpenTime;

        if (request.CloseTime != null)
            poi.CloseTime = request.CloseTime;

        if (request.PriceText != null)
            poi.PriceText = request.PriceText;

        if (request.Phone != null)
            poi.Phone = request.Phone;

        if (request.WebsiteUrl != null)
            poi.WebsiteUrl = request.WebsiteUrl;

        poi.Status = "pending";
        poi.RejectedReason = null;
        poi.UpdatedAt = DateTime.UtcNow;

        try
        {
            _db.Pois.Update(poi);
            SyncImages(poi.Id, request.Images);
            SyncTranslations(poi.Id, request.Translations);
            SyncAudios(poi.Id, request.Audios);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException exception)
        {
            return StatusCode(500, new { message = "Không lưu được POI vào DB. Kiểm tra migration/schema và dữ liệu nhập.", detail = exception.InnerException?.Message ?? exception.Message });
        }

        return Ok(new { message = "POI được cập nhật thành công" });
    }

    // =========================
    // DELETE POI
    // =========================
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePoi(string id, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == id);

        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền xóa POI này");

        _db.Pois.Remove(poi);
        await _db.SaveChangesAsync();

        return Ok(new { message = "POI được xóa thành công" });
    }

    // =========================
    // GET ANALYTICS
    // =========================
    [HttpGet("analytics/summary")]
    public async Task<IActionResult> GetAnalytics([FromQuery] int ownerId)
    {
        var user = await _db.Users.FindAsync(ownerId);
        if (user == null)
            return NotFound();

        var pois = await _db.Pois.Where(x => x.OwnerId == ownerId).ToListAsync();
        var poisIds = pois.Select(x => x.Id).ToList();

        var listenCounts = await _db.ListenLogs
            .Where(x => poisIds.Contains(x.PoiId))
            .GroupBy(x => x.PoiId)
            .Select(g => new { poi_id = g.Key, count = g.Count() })
            .ToListAsync();

        var totalListens = listenCounts.Sum(x => x.count);

        var topPois = pois
            .Select(x => new
            {
                x.Id,
                x.Name,
                listened_count = listenCounts.FirstOrDefault(l => l.poi_id == x.Id)?.count ?? 0
            })
            .OrderByDescending(x => x.listened_count)
            .Take(5);

        var avgDuration = await _db.ListenLogs
            .Where(x => poisIds.Contains(x.PoiId))
            .AverageAsync(x => (double?)x.DurationSeconds) ?? 0;

        return Ok(new
        {
            total_pois = pois.Count,
            total_listens = totalListens,
            avg_duration_seconds = (int)avgDuration,
            pending_pois = pois.Count(x => x.Status == "pending"),
            approved_pois = pois.Count(x => x.Status == "approved"),
            rejected_pois = pois.Count(x => x.Status == "rejected"),
            top_pois = topPois
        });
    }

    private void SyncImages(string poiId, List<string>? imageUrls)
    {
        if (imageUrls == null)
            return;

        var existing = _db.PoiImages.Where(x => x.PoiId == poiId).ToList();
        _db.PoiImages.RemoveRange(existing);

        var cleanUrls = imageUrls
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();

        for (var i = 0; i < cleanUrls.Count; i++)
        {
            _db.PoiImages.Add(new PoiImage
            {
                PoiId = poiId,
                ImageUrl = cleanUrls[i],
                SortOrder = i + 1
            });
        }
    }

    private void SyncTranslations(string poiId, List<PoiTranslationRequest>? translations)
    {
        if (translations == null)
            return;

        var existing = _db.PoiTranslations.Where(x => x.PoiId == poiId).ToList();
        _db.PoiTranslations.RemoveRange(existing);

        foreach (var item in translations.Where(x => !string.IsNullOrWhiteSpace(x.LanguageCode)))
        {
            _db.PoiTranslations.Add(new PoiTranslation
            {
                PoiId = poiId,
                LanguageCode = item.LanguageCode.Trim(),
                Name = item.Name,
                Category = item.Category,
                ShortDescription = item.ShortDescription,
                Description = item.Description,
                Address = item.Address,
                PriceText = item.PriceText,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    private void SyncAudios(string poiId, List<PoiAudioRequest>? audios)
    {
        if (audios == null)
            return;

        var existing = _db.AudioGuides.Where(x => x.PoiId == poiId).ToList();
        _db.AudioGuides.RemoveRange(existing);

        foreach (var item in audios.Where(x => !string.IsNullOrWhiteSpace(x.LanguageCode) && !string.IsNullOrWhiteSpace(x.ScriptText)))
        {
            _db.AudioGuides.Add(new AudioGuide
            {
                Id = $"{poiId}_{item.LanguageCode.Trim()}",
                PoiId = poiId,
                LanguageCode = item.LanguageCode.Trim(),
                LanguageName = item.LanguageName ?? item.LanguageCode,
                VoiceName = item.VoiceName ?? "System",
                ScriptText = item.ScriptText,
                AudioUrl = item.AudioUrl,
                ApprovalStatus = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    private static string SerializeCategories(List<string>? categories, string? fallback)
    {
        var cleanCategories = (categories ?? new List<string>())
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (!cleanCategories.Any() && !string.IsNullOrWhiteSpace(fallback))
            cleanCategories.Add(fallback.Trim());

        return JsonSerializer.Serialize(cleanCategories);
    }

    private static List<string> DeserializeCategories(string? categoriesJson, string? fallback)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(categoriesJson))
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(categoriesJson);
                if (parsed != null && parsed.Count > 0)
                    return parsed;
            }
        }
        catch
        {
        }

        return string.IsNullOrWhiteSpace(fallback) ? new List<string>() : new List<string> { fallback };
    }
}

public class CreatePoiRequest
{
    public string Name { get; set; } = "";
    public string ShortDescription { get; set; } = "";
    public string Description { get; set; } = "";
    public string Address { get; set; } = "";
    public string? Category { get; set; }
    public List<string>? Categories { get; set; }
    public string? OpenTime { get; set; }
    public string? CloseTime { get; set; }
    public string? PriceText { get; set; }
    public string? Phone { get; set; }
    public string? WebsiteUrl { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int? Radius { get; set; }
    public int? Priority { get; set; }
    public List<string>? Images { get; set; }
    public List<PoiTranslationRequest>? Translations { get; set; }
    public List<PoiAudioRequest>? Audios { get; set; }
}

public class TranslateRequest
{
    public string Text { get; set; } = "";
    public string SourceLanguage { get; set; } = "vi";
    public string TargetLanguage { get; set; } = "en";
}

public class UpdatePoiRequest
{
    public string? Name { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? Category { get; set; }
    public List<string>? Categories { get; set; }
    public string? OpenTime { get; set; }
    public string? CloseTime { get; set; }
    public string? PriceText { get; set; }
    public string? Phone { get; set; }
    public string? WebsiteUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? Radius { get; set; }
    public int? Priority { get; set; }
    public List<string>? Images { get; set; }
    public List<PoiTranslationRequest>? Translations { get; set; }
    public List<PoiAudioRequest>? Audios { get; set; }
}

public class PoiTranslationRequest
{
    public string LanguageCode { get; set; } = "vi";
    public string? Name { get; set; }
    public string? Category { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? PriceText { get; set; }
}

public class PoiAudioRequest
{
    public string LanguageCode { get; set; } = "vi";
    public string? LanguageName { get; set; }
    public string? VoiceName { get; set; }
    public string ScriptText { get; set; } = "";
    public string? AudioUrl { get; set; }
}
