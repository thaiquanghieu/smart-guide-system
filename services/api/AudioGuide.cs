using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartGuideAPI.Models;

[Table("audio_guides")]
public class AudioGuide
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = "";

    [Column("poi_id")]
    public string PoiId { get; set; } = "";

    [Column("language_code")]
    public string LanguageCode { get; set; } = "vi";

    [Column("language_name")]
    public string LanguageName { get; set; } = "Tiếng Việt";

    [Column("voice_name")]
    public string VoiceName { get; set; } = "";

    [Column("script_text")]
    public string ScriptText { get; set; } = "";

    [Column("audio_url")]
    public string? AudioUrl { get; set; }

    [Column("approval_status")]
    public string ApprovalStatus { get; set; } = "pending";

    [Column("rejected_reason")]
    public string? RejectedReason { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
