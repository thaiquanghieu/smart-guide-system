using Microsoft.Maui.Storage;
using SmartGuideApp.Pages;
using System.Net.Http;

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

        // Decide initial page immediately to avoid showing Login briefly when user is already signed in
        var userId = Preferences.Get("user_id", 0);
        if (userId == 0)
        {
            MainPage = new NavigationPage(new LoginPage());
        }
        else
        {
            // Assume user is signed in — show main shell immediately, then verify subscription in background
            MainPage = new AppShell();
        }

        // Run subscription check in background (will replace MainPage with Paywall if needed)
        _ = CheckAccess();
    }

    // =========================
    // CHECK SUB
    // =========================
    private async Task CheckAccess()
    {
        var userId = Preferences.Get("user_id", 0);

        // If not logged in, nothing to do here
        if (userId == 0)
            return;

        try
        {
            var client = new HttpClient();
            var res = await client.GetAsync($"http://192.168.22.4:5022/api/payments/check?userId={userId}");
            var json = await res.Content.ReadAsStringAsync();

            var result = System.Text.Json.JsonSerializer.Deserialize<CheckResponse>(json);

            if (result != null && result.isActive)
            {
                // already showing AppShell — nothing to change
            }
            else
            {
                // show paywall if subscription inactive
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    MainPage = new NavigationPage(new PaywallPage(false));
                });
            }
        }
        catch
        {
            // network error: keep the current MainPage (don't force user back to Login)
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

    class CheckResponse
    {
        public bool isActive { get; set; }
        public DateTime? expire { get; set; }
    }
}