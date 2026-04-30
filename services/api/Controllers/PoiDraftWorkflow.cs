using SmartGuideAPI.Data;
using SmartGuideAPI.Models;
using System.Text.Json;

namespace SmartGuideAPI.Controllers;

internal static class PoiDraftWorkflow
{
    public static string? Validate(CreatePoiRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return "Tên POI không được để trống";

        if (request.Latitude < -90 || request.Latitude > 90)
            return "Latitude không hợp lệ";

        if (request.Longitude < -180 || request.Longitude > 180)
            return "Longitude không hợp lệ";

        return null;
    }

    public static async Task<Poi> CreatePoiFromDraftAsync(AppDbContext db, CreatePoiRequest request, int ownerId, DateTime? now = null, string? forcedPoiId = null)
    {
        var validationError = Validate(request);
        if (!string.IsNullOrWhiteSpace(validationError))
            throw new InvalidOperationException(validationError);

        var timestamp = now ?? DateTime.UtcNow;
        var poi = new Poi
        {
            Id = string.IsNullOrWhiteSpace(forcedPoiId) ? Guid.NewGuid().ToString("N")[..20] : forcedPoiId.Trim(),
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
            CreatedAt = timestamp,
            UpdatedAt = timestamp
        };

        db.Pois.Add(poi);
        await db.SaveChangesAsync();

        SyncImages(db, poi.Id, request.Images);
        SyncTranslations(db, poi.Id, request.Translations);
        SyncAudios(db, poi.Id, request.Audios);
        await db.SaveChangesAsync();

        return poi;
    }

    public static string SerializeRequest(CreatePoiRequest request)
    {
        return JsonSerializer.Serialize(request);
    }

    public static CreatePoiRequest? DeserializeRequest(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return null;

        return JsonSerializer.Deserialize<CreatePoiRequest>(payload);
    }

    public static string? ExtractPoiName(string? payload)
    {
        return DeserializeRequest(payload)?.Name;
    }

    private static void SyncImages(AppDbContext db, string poiId, List<string>? imageUrls)
    {
        var existing = db.PoiImages.Where(x => x.PoiId == poiId).ToList();
        if (existing.Count > 0)
            db.PoiImages.RemoveRange(existing);

        if (imageUrls == null)
            return;

        var sanitized = imageUrls
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => url.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        for (var index = 0; index < sanitized.Count; index++)
        {
            db.PoiImages.Add(new PoiImage
            {
                PoiId = poiId,
                ImageUrl = sanitized[index],
                SortOrder = index
            });
        }
    }

    private static void SyncTranslations(AppDbContext db, string poiId, List<PoiTranslationRequest>? translations)
    {
        var existing = db.PoiTranslations.Where(x => x.PoiId == poiId).ToList();
        if (existing.Count > 0)
            db.PoiTranslations.RemoveRange(existing);

        if (translations == null)
            return;

        foreach (var translation in translations.Where(item => item != null))
        {
            if (string.IsNullOrWhiteSpace(translation.LanguageCode))
                continue;

            db.PoiTranslations.Add(new PoiTranslation
            {
                PoiId = poiId,
                LanguageCode = translation.LanguageCode.Trim(),
                Name = translation.Name,
                Category = translation.Category,
                ShortDescription = translation.ShortDescription,
                Description = translation.Description,
                Address = translation.Address,
                PriceText = translation.PriceText,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    private static void SyncAudios(AppDbContext db, string poiId, List<PoiAudioRequest>? audios)
    {
        var existing = db.AudioGuides.Where(x => x.PoiId == poiId).ToList();
        if (existing.Count > 0)
            db.AudioGuides.RemoveRange(existing);

        if (audios == null)
            return;

        foreach (var audio in audios.Where(item => item != null))
        {
            if (string.IsNullOrWhiteSpace(audio.LanguageCode) || string.IsNullOrWhiteSpace(audio.ScriptText))
                continue;

            db.AudioGuides.Add(new AudioGuide
            {
                Id = Guid.NewGuid().ToString("N")[..20],
                PoiId = poiId,
                LanguageCode = audio.LanguageCode.Trim(),
                LanguageName = string.IsNullOrWhiteSpace(audio.LanguageName) ? audio.LanguageCode.Trim() : audio.LanguageName.Trim(),
                VoiceName = string.IsNullOrWhiteSpace(audio.VoiceName) ? "system" : audio.VoiceName.Trim(),
                ScriptText = audio.ScriptText.Trim(),
                AudioUrl = audio.AudioUrl,
                ApprovalStatus = "pending",
                RejectedReason = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    private static string SerializeCategories(List<string>? categories, string? fallback)
    {
        var cleanCategories = (categories ?? new List<string>())
            .Where(category => !string.IsNullOrWhiteSpace(category))
            .Select(category => category.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (cleanCategories.Count == 0 && !string.IsNullOrWhiteSpace(fallback))
            cleanCategories.Add(fallback.Trim());

        return JsonSerializer.Serialize(cleanCategories);
    }
}
