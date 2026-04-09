using Microsoft.Maui.Storage;

namespace SmartGuideApp.Views;

public partial class ProfilePage : ContentPage
{
    public ProfilePage()
    {
        InitializeComponent();
    }

    private void OnAutoPlayToggled(object sender, ToggledEventArgs e)
    {
        Preferences.Set("auto_play", e.Value);
    }

    private void OnOpenSettingsTapped(object sender, EventArgs e)
    {
        var isAuto = Preferences.Get("auto_play", false);

        AutoPlaySwitch.IsToggled = isAuto;
        SettingsPopup.IsVisible = true;
    }

    private void OnCloseSettingsClicked(object sender, EventArgs e)
    {
        SettingsPopup.IsVisible = false;
    }
}