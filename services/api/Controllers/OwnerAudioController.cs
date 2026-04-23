using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/owner/audio")]
public class OwnerAudioController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public OwnerAudioController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    // =========================
    // GET AUDIO BY POI
    // =========================
    [HttpGet("{poiId}")]
    public async Task<IActionResult> GetAudioByPoi(string poiId, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == poiId);
        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền truy cập");

        var audios = await _db.AudioGuides
            .Where(x => x.PoiId == poiId)
            .ToListAsync();

        return Ok(audios.Select(a => new
        {
            a.Id,
            a.LanguageCode,
            a.LanguageName,
            a.VoiceName,
            a.ScriptText,
            a.AudioUrl,
            a.ApprovalStatus,
            a.RejectedReason
        }));
    }

    // =========================
    // CREATE AUDIO (TEXT/TTS)
    // =========================
    [HttpPost("tts")]
    public async Task<IActionResult> CreateAudioTTS([FromBody] CreateAudioRequest request, [FromQuery] int ownerId)
    {
        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == request.PoiId);
        if (poi == null)
            return NotFound(new { message = "POI không tồn tại" });

        if (poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền");

        if (string.IsNullOrWhiteSpace(request.ScriptText))
            return BadRequest(new { message = "Nội dung không được để trống" });

        var existingAudio = await _db.AudioGuides
            .FirstOrDefaultAsync(x => x.PoiId == request.PoiId && x.LanguageCode == request.LanguageCode);

        if (existingAudio != null)
        {
            existingAudio.ScriptText = request.ScriptText;
            existingAudio.VoiceName = request.VoiceName ?? "System";
            existingAudio.AudioUrl = request.AudioUrl;
            existingAudio.ApprovalStatus = "pending";
            existingAudio.RejectedReason = null;
            existingAudio.UpdatedAt = DateTime.UtcNow;
            _db.AudioGuides.Update(existingAudio);
        }
        else
        {
            var audio = new AudioGuide
            {
                Id = $"{request.PoiId}_{request.LanguageCode}",
                PoiId = request.PoiId,
                LanguageCode = request.LanguageCode,
                LanguageName = request.LanguageName ?? "Tiếng Việt",
                VoiceName = request.VoiceName ?? "System",
                ScriptText = request.ScriptText,
                AudioUrl = request.AudioUrl,
                ApprovalStatus = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.AudioGuides.Add(audio);
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Audio được lưu thành công" });
    }

    // =========================
    // UPDATE AUDIO
    // =========================
    [HttpPut("{audioId}")]
    public async Task<IActionResult> UpdateAudio(string audioId, [FromBody] UpdateAudioRequest request, [FromQuery] int ownerId)
    {
        var audio = await _db.AudioGuides.FirstOrDefaultAsync(x => x.Id == audioId);
        if (audio == null)
            return NotFound(new { message = "Audio không tồn tại" });

        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == audio.PoiId);
        if (poi == null || poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền");

        if (!string.IsNullOrWhiteSpace(request.ScriptText))
            audio.ScriptText = request.ScriptText;

        if (!string.IsNullOrWhiteSpace(request.VoiceName))
            audio.VoiceName = request.VoiceName;

        if (request.AudioUrl != null)
            audio.AudioUrl = request.AudioUrl;

        audio.ApprovalStatus = "pending";
        audio.RejectedReason = null;
        audio.UpdatedAt = DateTime.UtcNow;

        _db.AudioGuides.Update(audio);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Audio được cập nhật thành công" });
    }

    // =========================
    // DELETE AUDIO
    // =========================
    [HttpDelete("{audioId}")]
    public async Task<IActionResult> DeleteAudio(string audioId, [FromQuery] int ownerId)
    {
        var audio = await _db.AudioGuides.FirstOrDefaultAsync(x => x.Id == audioId);
        if (audio == null)
            return NotFound(new { message = "Audio không tồn tại" });

        var poi = await _db.Pois.FirstOrDefaultAsync(x => x.Id == audio.PoiId);
        if (poi == null || poi.OwnerId != ownerId)
            return Forbid("Bạn không có quyền");

        _db.AudioGuides.Remove(audio);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Audio được xóa thành công" });
    }
}

public class CreateAudioRequest
{
    public string PoiId { get; set; } = "";
    public string LanguageCode { get; set; } = "vi";
    public string? LanguageName { get; set; }
    public string? VoiceName { get; set; }
    public string ScriptText { get; set; } = "";
    public string? AudioUrl { get; set; }
}

public class UpdateAudioRequest
{
    public string? ScriptText { get; set; }
    public string? VoiceName { get; set; }
    public string? AudioUrl { get; set; }
}
