using Microsoft.Maui.Storage;

namespace SmartGuideApp;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

        // Ensure first-run defaults for preferences. If the user has never set
        // "auto_play", enable it by default on fresh installs.
        try
        {
            if (!Preferences.ContainsKey("auto_play"))
            {
                Preferences.Set("auto_play", true);
            }
        }
        catch
        {
            // If Preferences API isn't available for some reason, swallow
            // the exception to avoid crashing the app on startup.
        }

        MainPage = new AppShell();
    }


    protected override async void OnAppLinkRequestReceived(Uri uri)
    {
        base.OnAppLinkRequestReceived(uri);

        try
        {
            System.Diagnostics.Debug.WriteLine($"DeepLink: {uri}");

            if (uri.Host == "poi")
            {
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                var poiId = query["id"];

                if (!string.IsNullOrEmpty(poiId))
                {
                    await Shell.Current.GoToAsync($"///DetailPage?poiId={poiId}");
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"DeepLink error: {ex.Message}");
        }
    }


}