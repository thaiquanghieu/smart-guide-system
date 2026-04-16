namespace SmartGuideApp.Pages;

public partial class LoadingPage : ContentPage
{
    public LoadingPage()
    {
        Content = new VerticalStackLayout
        {
            VerticalOptions = LayoutOptions.Center,
            HorizontalOptions = LayoutOptions.Center,
            Children =
            {
                new Label { Text = "Loading...", FontSize = 20 }
            }
        };

        _ = Check();
    }

    private async Task Check()
    {
        var userId = Preferences.Get("user_id", 0);

        try
        {
            var client = new HttpClient();
            var url = $"http://192.168.22.4:5022/api/payments/check?userId={userId}";

            var res = await client.GetAsync(url);
            var json = await res.Content.ReadAsStringAsync();

            var result = System.Text.Json.JsonSerializer.Deserialize<CheckResponse>(json);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (result != null && result.isActive)
                    Application.Current!.MainPage = new AppShell();
                else
                    Application.Current!.MainPage = new NavigationPage(new PaywallPage(false));
            });
        }
        catch
        {
            Application.Current!.MainPage = new NavigationPage(new PaywallPage(false));
        }
    }

    class CheckResponse
    {
        public bool isActive { get; set; }
        public DateTime? expire { get; set; }
    }
}