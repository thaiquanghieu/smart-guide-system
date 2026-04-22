namespace SmartGuideApp.Models;

public class AudioGuide
{
    public string Id { get; set; } = string.Empty;
    public string LanguageCode { get; set; } = "vi";
    public string LanguageName { get; set; } = "Tiếng Việt";
    public string VoiceName { get; set; } = string.Empty;

    public string DurationText { get; set; } = string.Empty;

    public string ScriptText { get; set; } = string.Empty;
}