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
}