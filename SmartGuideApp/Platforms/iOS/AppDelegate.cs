using Foundation;
using SmartGuideApp.Views;

namespace SmartGuideApp;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

	public override bool OpenUrl(UIKit.UIApplication app, Foundation.NSUrl url, Foundation.NSDictionary options)
	{
		try
		{
			var uri = new Uri(url.AbsoluteString);

			System.Diagnostics.Debug.WriteLine($"DeepLink iOS: {uri}");

			if (uri.Host == "poi")
			{
				var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
				var poiId = query["id"];

				if (!string.IsNullOrEmpty(poiId))
				{
					MainThread.BeginInvokeOnMainThread(async () =>
					{
						await Shell.Current.GoToAsync($"{nameof(DetailPage)}?poiId={poiId}");
					});
				}
			}
		}
		catch (Exception ex)
		{
			System.Diagnostics.Debug.WriteLine($"DeepLink error: {ex.Message}");
		}

		return true;
	}
}
