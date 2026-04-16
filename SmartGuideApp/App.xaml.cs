using Microsoft.Maui.Storage;
using SmartGuideApp.Pages;
using System.Net.Http;

namespace SmartGuideApp;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

        // default auto play
        try
        {
            if (!Preferences.ContainsKey("auto_play"))
            {
                Preferences.Set("auto_play", true);
            }
        }
        catch { }

        _ = CheckAccess();
    }

    // =========================
    // CHECK SUB
    // =========================
    private async Task CheckAccess()
    {
        var userId = Preferences.Get("user_id", 0);

        if (userId == 0)
        {
            MainPage = new NavigationPage(new LoginPage());
            return;
        }

        try
        {
            var client = new HttpClient();
            var res = await client.GetAsync($"http://192.168.22.4:5022/api/payments/check?userId={userId}");
            var json = await res.Content.ReadAsStringAsync();

            var result = System.Text.Json.JsonSerializer.Deserialize<CheckResponse>(json);

            if (result != null && result.isActive)
                MainPage = new AppShell();
            else
                MainPage = new NavigationPage(new PaywallPage(false));
        }
        catch
        {
            MainPage = new NavigationPage(new LoginPage());
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