namespace SmartGuideApp.ViewModels;

public class LanguageItem
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";

    public override string ToString() => Name;
}
