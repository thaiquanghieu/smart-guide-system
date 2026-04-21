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
                new ActivityIndicator { IsRunning = true, Color = Color.FromArgb("#0F5BD7"), WidthRequest = 48, HeightRequest = 48 },
                new Label { Text = "Đang kiểm tra thiết bị...", FontSize = 20, Margin = new Thickness(0, 16, 0, 0), HorizontalTextAlignment = TextAlignment.Center }
            }
        };
    }
}
