namespace SmartGuideApp;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

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