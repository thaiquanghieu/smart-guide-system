using Microsoft.Maui.Storage;
using SmartGuideApp.Pages;

namespace SmartGuideApp;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

        try
        {
            if (!Preferences.ContainsKey("auto_play"))
            {
                Preferences.Set("auto_play", true);
            }
        }
        catch { }

        MainPage = new LoadingPage();
        _ = InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        var api = new ApiService();

        try
        {
            var deviceRegistration = await api.EnsureDeviceReadyAsync();
            if (!deviceRegistration.ok)
            {
                Preferences.Set("subscription_active", false);

                MainThread.BeginInvokeOnMainThread(() =>
                {
                    MainPage = new NavigationPage(new PaywallPage(false));
                });
                return;
            }

            var subscription = await api.CheckSubscriptionAsync();

            Preferences.Set("subscription_active", subscription.Item1);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                MainPage = subscription.Item1
                    ? new AppShell()
                    : new NavigationPage(new PaywallPage(false));
            });
        }
        catch
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Preferences.Set("subscription_active", false);
                MainPage = new NavigationPage(new PaywallPage(false));
            });
        }
    }

    // =========================
    // DEEP LINK (GIỮ NGUYÊN)
    // =========================
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
